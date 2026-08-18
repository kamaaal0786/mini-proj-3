"""
preprocess.py — Phase 2 ML Pipeline
Loads UCI 'Predict Students Dropout and Academic Success' dataset,
selects the 5 model features, scales, splits, saves the scaler.

Usage:
    cd "mini proj"
    python ml/preprocess.py
"""
import os
import sys
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'public')
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'model')
os.makedirs(MODEL_DIR, exist_ok=True)

# Expected column names in the UCI dataset (semicolon-separated CSV)
# We map them to the names our system uses
COLUMN_MAP = {
    'Curricular units 1st sem (approved)': 'credits_sem1',
    'Curricular units 2nd sem (approved)': 'credits_sem2',
    'Curricular units 1st sem (grade)': 'gpa',
    'Curricular units 2nd sem (grade)': 'marks',
    'Curricular units 1st sem (evaluations)': 'assignment_completion',
    'Curricular units 1st sem (without evaluations)': 'failed_subjects',
    'Target': 'target'
}

# Features the inference service will use
FEATURE_COLS = ['attendance', 'marks', 'gpa', 'assignment_completion', 'failed_subjects']

# The UCI dataset does not have an 'attendance' column directly,
# so we engineer it from enrolled vs approved credits.
# attendance = credits_approved_sem1 / max(credits_approved_sem1) * 100


def load_dataset() -> pd.DataFrame:
    """Load dataset — tries local file, then downloads from UCI."""
    local_path = os.path.join(DATA_DIR, 'dataset.csv')

    if not os.path.exists(local_path):
        print("Dataset not found locally. Downloading from UCI...")
        import urllib.request
        url = (
            "https://archive.ics.uci.edu/ml/machine-learning-databases"
            "/00697/dataset_57.zip"
        )
        # Fallback — direct CSV link via GitHub mirror
        url = (
            "https://raw.githubusercontent.com/dssg-pt/mp-ipca-ai/"
            "main/data/dataset.csv"
        )
        try:
            urllib.request.urlretrieve(url, local_path)
            print(f"Downloaded to {local_path}")
        except Exception as e:
            print(f"Download failed: {e}")
            print("Please download the dataset manually from:")
            print("https://archive.ics.uci.edu/dataset/697/predict+students+dropout+and+academic+success")
            print(f"Save it as: {local_path}")
            sys.exit(1)
    return pd.read_csv(local_path, sep=';')


def preprocess(df: pd.DataFrame):
    """Engineer features, encode target, split and scale."""
    print(f"Raw dataset: {df.shape[0]} rows, {df.shape[1]} columns")

    # Target: keep only Graduate and Dropout (drop Enrolled)
    df = df[df['Target'].isin(['Graduate', 'Dropout'])].copy()
    df['target'] = (df['Target'] == 'Dropout').astype(int)
    print(f"After filtering enrolled rows: {df.shape[0]} rows")

    # Map UCI feature names to our app names
    df = df.rename(columns={
        'Curricular units 1st sem (grade)': 'gpa',
        'Curricular units 2nd sem (grade)': 'marks',
        'Curricular units 1st sem (evaluations)': 'assignment_completion',
        'Curricular units 1st sem (without evaluations)': 'failed_subjects',
        'Curricular units 1st sem (approved)': 'credits_approved',
    })

    # Engineer attendance: 0-100 scale based on approved / max possible * 100
    max_credits = df['credits_approved'].max()
    df['attendance'] = (df['credits_approved'] / max_credits * 100).clip(0, 100)

    # Normalize marks and gpa to 0-100 scale (UCI uses 0-20)
    for col in ['marks', 'gpa']:
        if col in df.columns:
            df[col] = (df[col] / df[col].max() * 100).clip(0, 100)

    # Normalize assignment_completion to 0-100
    if 'assignment_completion' in df.columns:
        df['assignment_completion'] = (
            df['assignment_completion'] / df['assignment_completion'].max() * 100
        ).clip(0, 100)

    # Make sure failed_subjects is an integer 0+
    if 'failed_subjects' in df.columns:
        df['failed_subjects'] = df['failed_subjects'].clip(0, 20)

    # Select and validate
    required = FEATURE_COLS + ['target']
    for col in required:
        if col not in df.columns:
            raise ValueError(f"Missing column after mapping: {col}")

    df = df[required].dropna()
    print(f"After feature selection and dropna: {df.shape[0]} rows")

    X = df[FEATURE_COLS].values
    y = df['target'].values

    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.30, random_state=42, stratify=y)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp)

    # Fit scaler on train only
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_val_s = scaler.transform(X_val)
    X_test_s = scaler.transform(X_test)

    # Save
    joblib.dump(scaler, os.path.join(MODEL_DIR, 'scaler.joblib'))
    joblib.dump(FEATURE_COLS, os.path.join(MODEL_DIR, 'features.joblib'))
    np.save(os.path.join(MODEL_DIR, 'X_train.npy'), X_train_s)
    np.save(os.path.join(MODEL_DIR, 'X_val.npy'), X_val_s)
    np.save(os.path.join(MODEL_DIR, 'X_test.npy'), X_test_s)
    np.save(os.path.join(MODEL_DIR, 'y_train.npy'), y_train)
    np.save(os.path.join(MODEL_DIR, 'y_val.npy'), y_val)
    np.save(os.path.join(MODEL_DIR, 'y_test.npy'), y_test)

    print(f"Train: {X_train_s.shape[0]} | Val: {X_val_s.shape[0]} | Test: {X_test_s.shape[0]}")
    print(f"Dropout rate (train): {y_train.mean():.2%}")
    print("Scaler and splits saved to ml/model/")
    return X_train_s, X_val_s, X_test_s, y_train, y_val, y_test


if __name__ == '__main__':
    df = load_dataset()
    preprocess(df)
    print("Preprocessing complete.")
