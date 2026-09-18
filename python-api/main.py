from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
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
    model_eivp.train_model(True)
    return jsonify({
        'status': 'success',
        'message': 'Model trained successfully'
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