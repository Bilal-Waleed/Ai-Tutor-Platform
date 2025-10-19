import pandas as pd

# Load and process ielts writing for train
train_df = pd.read_csv("../datasets/ielts/ielts_writing_dataset.csv", encoding='utf-8', on_bad_lines='skip', sep=',')
print(f"Raw rows loaded: {len(train_df)}")
print(f"Columns: {train_df.columns.tolist()}")
print(f"Sample data:\n{train_df.head().to_string()}")  # First 5 rows
train_df = train_df.replace('', None)  # Empty strings to None
train_df = train_df.dropna(how='all')  # Remove only fully empty rows
print(f"After dropping fully empty rows: {len(train_df)}")
if len(train_df) == 0:
    print("Warning: No valid data after cleaning. Check the CSV file or adjust delimiter.")
else:
    train_df.to_json("../datasets/ielts/train_clean.jsonl", orient="records", lines=True)
    print(f"Train file saved with {len(train_df)} rows")

# Load and process speaking topics for test (unchanged)
test_df = pd.read_csv("../datasets/ielts/speaking_topics.csv", encoding='utf-8', on_bad_lines='skip')
print(f"Raw rows loaded: {len(test_df)}")
test_df = test_df.replace('', None)
test_df = test_df.dropna(how='all')
print(f"After dropping fully empty rows: {len(test_df)}")
if len(test_df) == 0:
    print("Warning: No valid data after cleaning. Check the CSV file.")
else:
    test_df.to_json("../datasets/ielts/test_clean.jsonl", orient="records", lines=True)
    print(f"Test file saved with {len(test_df)} rows")