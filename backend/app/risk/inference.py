"""
inference.py — ML Inference Service (singleton)
Loaded once at FastAPI startup via lifespan.
Provides predict() and explain() for any backend router.
"""
import os
import json
import logging
from typing import Optional
import numpy as np

logger = logging.getLogger(__name__)

MODEL_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', '..', '..', 'ml', 'model')
)

# Risk level thresholds (mirrored from config.py defaults)
RISK_LOW_MAX = 0.40
RISK_MED_MAX = 0.70


class ModelService:
    """Singleton that owns the loaded sklearn/xgboost model and scaler."""

    _instance: Optional['ModelService'] = None

    def __init__(self):
        self.model = None
        self.scaler = None
        self.features: list[str] = []
        self.model_version: str = 'dropout-v1'
        self.loaded = False

    @classmethod
    def get(cls) -> 'ModelService':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load(self):
        """Load model + scaler from disk. Called in FastAPI lifespan."""
        import joblib
        model_path  = os.path.join(MODEL_DIR, 'dropout_model.joblib')
        scaler_path = os.path.join(MODEL_DIR, 'scaler.joblib')
        feat_path   = os.path.join(MODEL_DIR, 'features.joblib')
        meta_path   = os.path.join(MODEL_DIR, 'metadata.json')

        if not os.path.exists(model_path):
            logger.warning(
                "ML model not found at %s — inference will return placeholder scores. "
                "Run: python ml/preprocess.py && python ml/train.py", model_path
            )
            return

        self.model   = joblib.load(model_path)
        self.scaler  = joblib.load(scaler_path)
        self.features = joblib.load(feat_path)

        if os.path.exists(meta_path):
            with open(meta_path) as f:
                meta = json.load(f)
            self.model_version = meta.get('model_version', 'dropout-v1')

        self.loaded = True
        logger.info("ML model loaded: %s (%s features)", self.model_version, len(self.features))

    def _feature_vector(self, data: dict) -> np.ndarray:
        """Build a numpy feature vector from a student data dict."""
        vec = [float(data.get(f, 0.0)) for f in self.features]
        return np.array(vec).reshape(1, -1)

    def predict(self, student_data: dict) -> dict:
        """
        Returns {probability, risk_level, model_version}.
        Falls back to a rule-based heuristic if model is not loaded.
        """
        if not self.loaded:
            return self._heuristic_predict(student_data)

        X = self._feature_vector(student_data)
        X_scaled = self.scaler.transform(X)
        prob = float(self.model.predict_proba(X_scaled)[0][1])

        return {
            'risk_probability': round(prob, 4),
            'risk_level': self._level(prob),
            'model_version': self.model_version,
        }

    def explain(self, student_data: dict) -> list[dict]:
        """
        Returns top SHAP factors: [{feature, impact, direction}].
        Falls back to rule-based explanation if SHAP/model unavailable.
        """
        if not self.loaded:
            return self._rule_explain(student_data)

        try:
            import shap
            X = self._feature_vector(student_data)
            X_scaled = self.scaler.transform(X)

            # Tree-based models → TreeExplainer; linear → LinearExplainer
            try:
                explainer = shap.TreeExplainer(self.model)
                shap_values = explainer.shap_values(X_scaled)
                # For binary classifiers, shap_values may be [neg_class, pos_class]
                if isinstance(shap_values, list):
                    sv = shap_values[1][0]
                else:
                    sv = shap_values[0]
            except Exception:
                explainer = shap.LinearExplainer(self.model, X_scaled)
                sv = explainer.shap_values(X_scaled)[0]

            # Sort by absolute impact
            pairs = sorted(zip(self.features, sv), key=lambda x: abs(x[1]), reverse=True)
            factors = []
            for feat, val in pairs[:5]:
                abs_val = abs(val)
                impact = 'high' if abs_val > 0.15 else ('medium' if abs_val > 0.07 else 'low')
                factors.append({
                    'feature': feat,
                    'impact': impact,
                    'direction': 'increases_risk' if val > 0 else 'reduces_risk',
                    'shap_value': round(float(val), 4),
                })
            return factors
        except Exception as exc:
            logger.warning("SHAP explanation failed: %s — using rule-based fallback", exc)
            return self._rule_explain(student_data)

    @staticmethod
    def _level(prob: float) -> str:
        if prob < RISK_LOW_MAX:
            return 'LOW'
        elif prob < RISK_MED_MAX:
            return 'MEDIUM'
        return 'HIGH'

    @staticmethod
    def _heuristic_predict(data: dict) -> dict:
        """Simple rule-based fallback when no trained model is available."""
        score = 0.2
        if float(data.get('attendance', 100)) < 75:
            score += 0.25
        if int(data.get('failed_subjects', 0)) >= 2:
            score += 0.20
        if float(data.get('gpa', 10)) < 5:
            score += 0.15
        if float(data.get('assignment_completion', 100)) < 60:
            score += 0.10
        prob = min(score, 0.95)
        return {
            'risk_probability': round(prob, 4),
            'risk_level': ModelService._level(prob),
            'model_version': 'heuristic-v0',
        }

    @staticmethod
    def _rule_explain(data: dict) -> list[dict]:
        """Rule-based explanations when SHAP is unavailable."""
        factors = []
        if float(data.get('attendance', 100)) < 75:
            factors.append({'feature': 'attendance', 'impact': 'high', 'direction': 'increases_risk', 'shap_value': 0.0})
        if int(data.get('failed_subjects', 0)) >= 2:
            factors.append({'feature': 'failed_subjects', 'impact': 'high', 'direction': 'increases_risk', 'shap_value': 0.0})
        if float(data.get('assignment_completion', 100)) < 60:
            factors.append({'feature': 'assignment_completion', 'impact': 'medium', 'direction': 'increases_risk', 'shap_value': 0.0})
        if float(data.get('gpa', 10)) < 5:
            factors.append({'feature': 'gpa', 'impact': 'medium', 'direction': 'increases_risk', 'shap_value': 0.0})
        return factors or [{'feature': 'gpa', 'impact': 'low', 'direction': 'reduces_risk', 'shap_value': 0.0}]
