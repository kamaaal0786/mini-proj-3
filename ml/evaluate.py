"""
evaluate.py — Phase 2 ML Evaluation
Loads saved model and scaler, runs on held-out test set,
prints and saves metrics to ml/model/eval_report.json.

Usage (after running train.py):
    cd "mini proj"
    python ml/evaluate.py
"""
import os
import json
import numpy as np
import joblib
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix, classification_report
)

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model')


def evaluate():
    model_path = os.path.join(MODEL_DIR, 'dropout_model.joblib')
    if not os.path.exists(model_path):
        print("No trained model found. Run train.py first.")
        return

    clf = joblib.load(model_path)
    with open(os.path.join(MODEL_DIR, 'metadata.json')) as f:
        metadata = json.load(f)

    X_test = np.load(os.path.join(MODEL_DIR, 'X_test.npy'))
    y_test = np.load(os.path.join(MODEL_DIR, 'y_test.npy'))

    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)[:, 1]

    cm = confusion_matrix(y_test, y_pred).tolist()
    report = {
        'model_name':  metadata['model_name'],
        'model_version': metadata['model_version'],
        'features': metadata['features'],
        'test_metrics': {
            'accuracy':  round(accuracy_score(y_test, y_pred), 4),
            'precision': round(precision_score(y_test, y_pred, zero_division=0), 4),
            'recall':    round(recall_score(y_test, y_pred, zero_division=0), 4),
            'f1':        round(f1_score(y_test, y_pred, zero_division=0), 4),
            'auc_roc':   round(roc_auc_score(y_test, y_prob), 4),
        },
        'confusion_matrix': cm,
        'val_metrics': metadata['val_metrics'],
        'all_val_results': metadata.get('all_results', {}),
    }

    print("\n=== Test Set Evaluation ===")
    print(f"Model       : {report['model_name']}")
    print(f"Features    : {', '.join(report['features'])}")
    print(f"Accuracy    : {report['test_metrics']['accuracy']:.4f}")
    print(f"Precision   : {report['test_metrics']['precision']:.4f}")
    print(f"Recall      : {report['test_metrics']['recall']:.4f}")
    print(f"F1 Score    : {report['test_metrics']['f1']:.4f}")
    print(f"AUC-ROC     : {report['test_metrics']['auc_roc']:.4f}")
    print(f"\nConfusion Matrix:\n  TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}  TP={cm[1][1]}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Graduate', 'Dropout']))

    out_path = os.path.join(MODEL_DIR, 'eval_report.json')
    with open(out_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\nReport saved to ml/model/eval_report.json")


if __name__ == '__main__':
    evaluate()
