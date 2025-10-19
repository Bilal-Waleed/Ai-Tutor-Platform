huggingface-cli download HuggingFaceH4/CodeAlpaca_20K --local-dir datasets/coding
kaggle datasets download -d thedevastator/coding-questions-with-solutions -p datasets/coding --unzip
huggingface-cli download openai/gsm8k --local-dir datasets/math/gsm8k
huggingface-cli download hendrycks/competition_math --local-dir datasets/math/math
kaggle datasets download -d shashwatwork/ielts-dataset -p datasets/ielts --unzip
wget https://github.com/Mushtari-Sadia/TOEFL-prep/raw/main/toefl_questions.json -O datasets/ielts/toefl.json
huggingface-cli download camel-ai/physics --local-dir datasets/physics