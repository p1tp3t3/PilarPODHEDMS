from flask import Flask, jsonify, request, render_template, Response
from flask_cors import CORS
import pandas as pd
from model_training.config_model import model_eivp, model_cca

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')



#------------------------------------------Model Routes-------------------------------------------
@app.route('/python/violation/add', methods=['POST'])
def add_violation():
    data = request.get_json()
    if not data or 'violation' not in data:
        return jsonify({"status": "error", "message": "Invalid payload"}), 400

    model_cca.add_violation(data['id'], data['violation'], data.get('keywords', ''))

    return jsonify({
        'status': 'success',
        'message': 'Violation added successfully'
    })

@app.route('/python/violation/update', methods=['POST'])
def update_violation():
    data = request.get_json()
    if not data or 'id' not in data or 'violation' not in data:
        return jsonify({"status": "error", "message": "Invalid payload"}), 400

    model_cca.update_violation(data['id'], data['violation'], data.get('keywords', ''))

    return jsonify({
        'status': 'success',
        'message': 'Violation updated successfully'
    })

@app.route('/python/violation/delete', methods=['POST'])
def delete_violation():
    data = request.get_json()
    if not data or 'id' not in data:
        return jsonify({"status": "error", "message": "Invalid payload"}), 400
    
    model_cca.delete_violation(data['id'])
        
    return jsonify({
        'status': 'success',
        'message': 'Violation deleted successfully'
    })


@app.route('/python/complaint/context', methods=['POST'])
def analyze_complaint_context():
    data = request.get_json()
    if not data or 'complaint_text' not in data:
        return jsonify({"status": "error", "message": "Invalid payload"}), 400

    complaint_text = data['complaint_text']
    results = model_cca.analyze(complaint_text)
    
    return jsonify({
        'data': results
    })
    
@app.route('/python/model/data/append', methods=['POST'])
def append_logistic_test_data():
    data = request.get_json()
    
    model_eivp.append(data)
    model_eivp.train_model(True)
        
    return jsonify({
        'status': 'success',
        'message': 'Test data appended successfully'
    })

@app.route('/python/model/train', methods=['POST'])
def train_model():
    evaluation = model_eivp.train_model(True)
    return jsonify({
        'status': 'success',
        'message': 'Model trained successfully',
        'eval': evaluation,
        'model': model_eivp.status(),
    })

# Many rows at once, probability only (no insights/recommendations) — the
# prefect dashboard's watch list scores every enrolled student this way.
@app.route('/python/model/predict/batch', methods=['POST'])
def predict_batch():
    data = request.get_json(silent=True) or {}
    rows = data.get('rows')
    if not isinstance(rows, list):
        return jsonify({'status': 'error', 'message': 'Expected {"rows": [...]}'}), 400
    return jsonify({'results': model_eivp.predict_batch(rows)})

# --- Maintenance page: status + management of both models ---
@app.route('/python/model/status', methods=['GET'])
def models_status():
    return jsonify({
        'eivp': model_eivp.status(),
        'cca': model_cca.status(),
    })

@app.route('/python/model/eivp/dataset', methods=['GET'])
def download_eivp_dataset():
    with open(model_eivp.csv_path(), encoding='utf-8') as f:
        csv_text = f.read()
    return Response(csv_text, mimetype='text/csv',
                    headers={'Content-Disposition': 'attachment; filename=student_violations.csv'})

@app.route('/python/model/eivp/dataset', methods=['POST'])
def upload_eivp_dataset():
    file = request.files.get('file')
    if file is None:
        return jsonify({'status': 'error', 'message': 'No CSV file uploaded'}), 400
    try:
        new_df = pd.read_csv(file)
        evaluation = model_eivp.replace_dataset(new_df)
    except (ValueError, pd.errors.ParserError) as e:
        return jsonify({'status': 'error', 'message': str(e)}), 422
    return jsonify({
        'status': 'success',
        'message': 'Dataset replaced and model retrained',
        'eval': evaluation,
        'model': model_eivp.status(),
    })

@app.route('/python/model/cca/rebuild', methods=['POST'])
def rebuild_cca():
    return jsonify({
        'status': 'success',
        'message': 'Violation embeddings rebuilt',
        'model': model_cca.rebuild(),
    })

@app.route('/python/model/predict', methods=['POST'])
def incident_risk():
    data = request.get_json()
    print(data)
    
    pred = model_eivp.predict(data)
    insight = model_eivp.get_insights(data, pred)
    reco = model_eivp.get_recommendation(data, pred)
    
        
    return jsonify({
        'prediction': pred,
        'insights': insight,
        'reco': reco
    })
    
#------------------------------------------------------------------------------------------------------

#------------------------------------------------------------------------------------------------------
if __name__ == '__main__':
    app.run(debug=True, port=5032)