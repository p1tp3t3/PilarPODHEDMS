import pandas as pd
import numpy as np
from gensim.models import KeyedVectors
from sklearn.metrics.pairwise import cosine_similarity
import re
import nltk
from nltk.data import find
from huggingface_hub import hf_hub_download



def safe_nltk_download(package):
    try:
        find(package)
    except LookupError:
        nltk.download(package.split('/')[-1])


# Download NLTK resources
safe_nltk_download('corpora/wordnet')
safe_nltk_download('corpora/omw-1.4')

from nltk.stem import WordNetLemmatizer


class ComplaintContextAnalyzer:
    def __init__(self):

        # MAIN VIOLATIONS CSV
        self.file_name = './dataset/violation_list.csv'
        self.df = pd.read_csv(self.file_name).fillna("")
        self.model_path = hf_hub_download(
            repo_id="NathaNn1111/word2vec-google-news-negative-300-bin",
            filename="GoogleNews-vectors-negative300.bin"
        )

        # Google News Word2Vec model
        self.model = None

        # Storage for vectorized violations
        self.violation_vectors = {}

        # Load & process
        self._load_google_word2vec()
        self._compute_violation_vectors()


    # ---------------------------------------------------------
    # Load Google News Word2Vec
    # ---------------------------------------------------------
    def _load_google_word2vec(self):
        print("📌 Loading GoogleNews Word2Vec...")
        self.model = KeyedVectors.load_word2vec_format(self.model_path, binary=True)
        print("✅ GoogleNews Word2Vec Loaded!")


    # ---------------------------------------------------------
    # Clean each word
    # ---------------------------------------------------------
    def _clean_word(self, word):
        word = word.lower().strip()
        word = re.sub(r"(.)\1{2,}", r"\1", word)  # reduce repeated chars
        return word


    # ---------------------------------------------------------
    # Tokenizer with NLTK lemmatization only
    # ---------------------------------------------------------
    def _tokenize(self, text):
        if not isinstance(text, str):
            return []

        # Keep letters only
        text = re.sub(r"[^a-zA-Záéíóúñ\s]", " ", text.lower())
        words = text.split()

        # STOPWORDS (expanded, with Filipino + English fillers)
        stopwords = {
            "ang","sa","ng","si","ni","kay","and","the","for","with","at",
            "na","naga","nya","sya","ko","ako","ka","ikaw","yung","dito","doon",
            "kasi","pero","dun","yan","po","kami","tayo","sila","nila","kanila",
            "kita","kayo","niya","mo","nyo","natin","amin","akin","iyo",
            "nga","pa","din","rin","man","naman","talaga","lang","pala","daw",
            "raw","ba","ha","uy","eh","ay","tas","tapos","kaya","kaso","hala",
            "hehe","haha","oh","weh","sana","ano","e","oo","opo","ho",
            "sobra","grabe","yata","parang","medyo","mga","lahat","dami",
            "kung","paano","ganun","ganon","ganito","ganyan",
            "sir","maam","mam","teacher","kuya","ate","miss","mr","mrs","ms",
            "a","an","is","am","are","was","were","be","been","being","that",
            "this","those","these","of","on","in","into","over","under","out",
            "to","from","up","down","off","by","so","such","just","really",
            "very","have","has","had","do","does","did","as","or","if","it",
            "its","it's","im","i'm","dont","didnt","didn't","can't","cant",
            "cannot","won't","wont","you're","youre",
            "lol","lmao","omg","wtf","idk","btw","pls","plss","po","poh",
            "ung","dn","dun","dunno","wer","der","ur","u","me","my","mine",
        }

        lemmatizer = WordNetLemmatizer()

        tokens = []
        for w in words:
            if len(w) > 2 and w not in stopwords:
                w = self._clean_word(w)
                
                # ⭐ NLTK lemmatization (handles plurals)
                lemma = lemmatizer.lemmatize(w)

                tokens.append(lemma)

        return tokens


    # ---------------------------------------------------------
    # Compute vector for every violation
    # ---------------------------------------------------------
    def _compute_violation_vectors(self):
        self.violation_vectors = {}
        print("📌 Computing violation embeddings...")

        # A violation's title alone is a short, weak signal (2-5 words) to
        # compare against a full complaint paragraph. Averaging in its
        # keywords too gives it a richer embedding — same pretrained model,
        # no retraining, keywords are just more tokens fed into the average.
        has_keywords = "keywords" in self.df.columns

        for _, row in self.df.iterrows():
            text = row["violation_text"]
            keywords = row["keywords"] if has_keywords else ""
            tokens = self._tokenize(f"{text} {keywords}")
            vectors = [self.model[w] for w in tokens if w in self.model]

            if vectors:
                self.violation_vectors[text] = np.mean(vectors, axis=0)

        print(f"✅ Embedded {len(self.violation_vectors)} violations.")


    # ---------------------------------------------------------
    # Analyze complaint text
    # ---------------------------------------------------------
    def analyze(self, complaint_text, top_n=10):
        tokens = self._tokenize(complaint_text)
        vectors = [self.model[w] for w in tokens if w in self.model]

        if not vectors:
            return "[]"

        complaint_vec = np.mean(vectors, axis=0)

        scored = []
        for violation, vec in self.violation_vectors.items():
            sim = float(cosine_similarity([complaint_vec], [vec])[0][0])
            scored.append((violation, sim))

        ranked = sorted(scored, key=lambda x: x[1], reverse=True)[:top_n]

        df = pd.DataFrame(ranked, columns=["violation", "similarity"])
        df["status"] = df["similarity"].apply(self._status)

        result = df.to_json(orient="records")
        return result


    # ---------------------------------------------------------
    # Similarity → Label
    # ---------------------------------------------------------
    def _status(self, score):
        if score >= 0.70: return "Very Strong Match"
        elif score >= 0.55: return "Strong Match"
        elif score >= 0.40: return "Likely Related"
        elif score >= 0.25: return "Possibly Related"
        return "Unclear / Needs Review"
    
    def add_violation(self, id, violation_text, keywords=""):
        # Append to CSV
        new_entry = pd.DataFrame({"id": [id], "violation_text": [violation_text], "keywords": [keywords]})
        new_entry.to_csv(self.file_name, mode='a', header=False, index=False)

        # Update internal dataframe
        self.df = pd.read_csv(self.file_name).fillna("")
        # Recompute vector
        self._compute_violation_vectors()

    def update_violation(self, id, new_violation_text, keywords=""):
        # Update in CSV
        self.df.loc[self.df['id'] == id, 'violation_text'] = new_violation_text
        self.df.loc[self.df['id'] == id, 'keywords'] = keywords
        self.df.to_csv(self.file_name, index=False)

        # Update internal dataframe
        self.df = pd.read_csv(self.file_name).fillna("")
        # Recompute vectors
        #self._load_google_word2vec()
        self._compute_violation_vectors()

    def delete_violation(self, id):
        # Remove from CSV
        self.df = self.df[self.df['id'] != id]
        self.df.to_csv(self.file_name, index=False)

        # Update internal dataframe
        self.df = pd.read_csv(self.file_name).fillna("")
        # Recompute vectors
        #self._load_google_word2vec()
        self._compute_violation_vectors()
