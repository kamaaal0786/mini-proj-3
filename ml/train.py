"""
train.py — Phase 2 ML Training
Trains Logistic Regression, Random Forest, and XGBoost on the preprocessed splits.
Selects best model by F1 on validation set, saves model + metadata.

Usage (after running preprocess.py):
    cd "mini proj"
    python ml/train.py
"""
import os
import json
import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score, accuracy_score, roc_auc_score, precision_score, recall_score
from xgboost import XGBClassifier

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model')


def load_splits():
    X_train = np.load(os.path.join(MODEL_DIR, 'X_train.npy'))
    X_val   = np.load(os.path.join(MODEL_DIR, 'X_val.npy'))
    y_train = np.load(os.path.join(MODEL_DIR, 'y_train.npy'))
    y_val   = np.load(os.path.join(MODEL_DIR, 'y_val.npy'))
    return X_train, X_val, y_train, y_val


CANDIDATES = {
    'LogisticRegression': LogisticRegression(max_iter=1000, random_state=42),
    'RandomForest': RandomForestClassifier(n_estimators=200, max_depth=8, random_state=42),
    'XGBoost': XGBClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.05,
        use_label_encoder=False, eval_metric='logloss', random_state=42
    ),
}


def train_and_select():
    X_train, X_val, y_train, y_val = load_splits()
    features = joblib.load(os.path.join(MODEL_DIR, 'features.joblib'))

    results = {}
    print(f"\n{'Model':<25} {'Accuracy':>9} {'Precision':>10} {'Recall':>7} {'F1':>7} {'AUC':>7}")
    print('-' * 65)

    for name, clf in CANDIDATES.items():
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_val)
        y_prob = clf.predict_proba(X_val)[:, 1]

        metrics = {
            'accuracy':  round(accuracy_score(y_val, y_pred), 4),
            'precision': round(precision_score(y_val, y_pred, zero_division=0), 4),
            'recall':    round(recall_score(y_val, y_pred, zero_division=0), 4),
            'f1':        round(f1_score(y_val, y_pred, zero_division=0), 4),
            'auc':       round(roc_auc_score(y_val, y_prob), 4),
        }
        results[name] = {'clf': clf, 'metrics': metrics}
        print(f"{name:<25} {metrics['accuracy']:>9.4f} {metrics['precision']:>10.4f} "
              f"{metrics['recall']:>7.4f} {metrics['f1']:>7.4f} {metrics['auc']:>7.4f}")

    # Select best by F1 on validation
    best_name = max(results, key=lambda k: results[k]['metrics']['f1'])
    best_clf  = results[best_name]['clf']
    best_metrics = results[best_name]['metrics']

    print(f"\nBest model: {best_name}  (val F1={best_metrics['f1']:.4f})")

    # Save model
    model_path = os.path.join(MODEL_DIR, 'dropout_model.joblib')
    joblib.dump(best_clf, model_path)

    # Save metadata
    metadata = {
        'model_name': best_name,
        'model_version': 'dropout-v1',
        'features': features,
        'val_metrics': best_metrics,
        'all_results': {k: v['metrics'] for k, v in results.items()},
    }
    with open(os.path.join(MODEL_DIR, 'metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"Model saved to ml/model/dropout_model.joblib")
    print(f"Metadata saved to ml/model/metadata.json")
    return best_clf, best_name, features


if __name__ == '__main__':
    train_and_select()
    print("Training complete.")
