import os
import pickle
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify, render_template
from sklearn import svm
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from difflib import get_close_matches
from flask_cors import CORS 
from dotenv import load_dotenv
from werkzeug.middleware.proxy_fix import ProxyFix
# load_dotenv()



# app = Flask(__name__)
# # CORS(app)

# CORS(
#     app,
#     origins=[
#         os.getenv("FRONTEND_URL"),
#         os.getenv("BACKEND_URL")
#     ],
#     supports_credentials=True
# )


load_dotenv()

PORT = os.getenv("FLASK_PORT1")
FRONTEND_URL = os.getenv("FRONTEND_URL")
BACKEND_URL = os.getenv("BACKEND_URL")


app = Flask(__name__)

# Important for Render deployment
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# CORS
CORS(
    app,
    origins=[
        FRONTEND_URL,
        BACKEND_URL
    ],
    supports_credentials=True
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Load the model and data files

insurance_model = pickle.load(open('models/insurancemodelf.pkl', 'rb'))
text_clf=pickle.load(open('models/nlp_model.pkl', 'rb'))
model = pickle.load(open('models/svc.pkl', 'rb'))  #Load for general model
best_model=pickle.load(open('models/best_svc_model.pkl', 'rb'))  #hyper parameter model
parkinsons_model = pickle.load(open('models/parkinsons_model.sav', 'rb'))  # Load Parkinson's model
heart_disease_model = pickle.load(open('models/heart_disease_model.sav', 'rb'))  # Load Heart Disease model
diabetes_model = pickle.load(open('models/diabetes_model.sav', 'rb')) #diabetes model



# Load data files
symptoms_df = pd.read_csv('models/symtoms_df.csv')
precautions_df = pd.read_csv('models/precautions_df.csv')
workout_df = pd.read_csv('models/workout_df.csv')
description_df = pd.read_csv('models/description.csv')
medications_df = pd.read_csv('models/medications.csv')
diets_df = pd.read_csv('models/diets.csv')

# Define dictionaries
symptoms_list = {'itching': 0, 'skin_rash': 1, 'nodal_skin_eruptions': 2, 'continuous_sneezing': 3, 'shivering': 4, 'chills': 5, 'joint_pain': 6, 'stomach_pain': 7, 'acidity': 8, 'ulcers_on_tongue': 9, 'muscle_wasting': 10, 'vomiting': 11, 'burning_micturition': 12, 'spotting_ urination': 13, 'fatigue': 14, 'weight_gain': 15, 'anxiety': 16, 'cold_hands_and_feets': 17, 'mood_swings': 18, 'weight_loss': 19, 'restlessness': 20, 'lethargy': 21, 'patches_in_throat': 22, 'irregular_sugar_level': 23, 'cough': 24, 'high_fever': 25, 'sunken_eyes': 26, 'breathlessness': 27, 'sweating': 28, 'dehydration': 29, 'indigestion': 30, 'headache': 31, 'yellowish_skin': 32, 'dark_urine': 33, 'nausea': 34, 'loss_of_appetite': 35, 'pain_behind_the_eyes': 36, 'back_pain': 37, 'constipation': 38, 'abdominal_pain': 39, 'diarrhoea': 40, 'mild_fever': 41, 'yellow_urine': 42, 'yellowing_of_eyes': 43, 'acute_liver_failure': 44, 'fluid_overload': 45, 'swelling_of_stomach': 46, 'swelled_lymph_nodes': 47, 'malaise': 48, 'blurred_and_distorted_vision': 49, 'phlegm': 50, 'throat_irritation': 51, 'redness_of_eyes': 52, 'sinus_pressure': 53, 'runny_nose': 54, 'congestion': 55, 'chest_pain': 56, 'weakness_in_limbs': 57, 'fast_heart_rate': 58, 'pain_during_bowel_movements': 59, 'pain_in_anal_region': 60, 'bloody_stool': 61, 'irritation_in_anus': 62, 'neck_pain': 63, 'dizziness': 64, 'cramps': 65, 'bruising': 66, 'obesity': 67, 'swollen_legs': 68, 'swollen_blood_vessels': 69, 'puffy_face_and_eyes': 70, 'enlarged_thyroid': 71, 'brittle_nails': 72, 'swollen_extremeties': 73, 'excessive_hunger': 74, 'extra_marital_contacts': 75, 'drying_and_tingling_lips': 76, 'slurred_speech': 77, 'knee_pain': 78, 'hip_joint_pain': 79, 'muscle_weakness': 80, 'stiff_neck': 81, 'swelling_joints': 82, 'movement_stiffness': 83, 'spinning_movements': 84, 'loss_of_balance': 85, 'unsteadiness': 86, 'weakness_of_one_body_side': 87, 'loss_of_smell': 88, 'bladder_discomfort': 89, 'foul_smell_of urine': 90, 'continuous_feel_of_urine': 91, 'passage_of_gases': 92, 'internal_itching': 93, 'toxic_look_(typhos)': 94, 'depression': 95, 'irritability': 96, 'muscle_pain': 97, 'altered_sensorium': 98, 'red_spots_over_body': 99, 'belly_pain': 100, 'abnormal_menstruation': 101, 'dischromic _patches': 102, 'watering_from_eyes': 103, 'increased_appetite': 104, 'polyuria': 105, 'family_history': 106, 'mucoid_sputum': 107, 'rusty_sputum': 108, 'lack_of_concentration': 109, 'visual_disturbances': 110, 'receiving_blood_transfusion': 111, 'receiving_unsterile_injections': 112, 'coma': 113, 'stomach_bleeding': 114, 'distention_of_abdomen': 115, 'history_of_alcohol_consumption': 116, 'fluid_overload.1': 117, 'blood_in_sputum': 118, 'prominent_veins_on_calf': 119, 'palpitations': 120, 'painful_walking': 121, 'pus_filled_pimples': 122, 'blackheads': 123, 'scurring': 124, 'skin_peeling': 125, 'silver_like_dusting': 126, 'small_dents_in_nails': 127, 'inflammatory_nails': 128, 'blister': 129, 'red_sore_around_nose': 130, 'yellow_crust_ooze': 131}
diseases_list = {15: 'Fungal infection', 4: 'Allergy', 16: 'GERD', 9: 'Chronic cholestasis', 14: 'Drug Reaction', 33: 'Peptic ulcer diseae', 1: 'AIDS', 12: 'Diabetes ', 17: 'Gastroenteritis', 6: 'Bronchial Asthma', 23: 'Hypertension ', 30: 'Migraine', 7: 'Cervical spondylosis', 32: 'Paralysis (brain hemorrhage)', 28: 'Jaundice', 29: 'Malaria', 8: 'Chicken pox', 11: 'Dengue', 37: 'Typhoid', 40: 'hepatitis A', 19: 'Hepatitis B', 20: 'Hepatitis C', 21: 'Hepatitis D', 22: 'Hepatitis E', 3: 'Alcoholic hepatitis', 36: 'Tuberculosis', 10: 'Common Cold', 34: 'Pneumonia', 13: 'Dimorphic hemmorhoids(piles)', 18: 'Heart attack', 39: 'Varicose veins', 26: 'Hypothyroidism', 24: 'Hyperthyroidism', 25: 'Hypoglycemia', 31: 'Osteoarthristis', 5: 'Arthritis', 0: '(vertigo) Paroymsal  Positional Vertigo', 2: 'Acne', 38: 'Urinary tract infection', 35: 'Psoriasis', 27: 'Impetigo'}
symptoms_dict = {symptom.lower(): index for index, symptom in enumerate(symptoms_list)}

# Function to standardize symptoms

synonyms = {
    'itching': 'itching',
    'skin rash': 'skin_rash',
    'rash': 'skin_rash',
    'eruption': 'nodal_skin_eruptions',
    'nodules': 'nodal_skin_eruptions',
    'sneeze': 'continuous_sneezing',
    'sneezing': 'continuous_sneezing',
    'shivers': 'shivering',
    'chills': 'chills',
    'cold': 'chills',
    'joint pain': 'joint_pain',
    'arthralgia': 'joint_pain',
    'stomach ache': 'stomach_pain',
    'abdominal pain': 'stomach_pain',
    'acid reflux': 'acidity',
    'heartburn': 'acidity',
    'tongue sores': 'ulcers_on_tongue',
    'muscle loss': 'muscle_wasting',
    'throwing up': 'vomiting',
    'burning urination': 'burning_micturition',
    'spotting': 'spotting_urination',
    'tiredness': 'fatigue',
    'weight increase': 'weight_gain',
    'anxiousness': 'anxiety',
    'cold hands': 'cold_hands_and_feets',
    'cold feet': 'cold_hands_and_feets',
    'mood changes': 'mood_swings',
    'weight reduction': 'weight_loss',
    'restless': 'restlessness',
    'lethargic': 'lethargy',
    'throat spots': 'patches_in_throat',
    'blood sugar fluctuation': 'irregular_sugar_level',
    'coughing': 'cough',
    'fever': 'high_fever',
    'high temperature': 'high_fever',
    'dehydration': 'dehydration',
    'head pain': 'headache',
    'yellow skin': 'yellowish_skin',
    'jaundice': 'yellowish_skin',
    'dark pee': 'dark_urine',
    'vomit': 'nausea',
    'appetite loss': 'loss_of_appetite',
    'pain behind eyes': 'pain_behind_the_eyes',
    'low back pain': 'back_pain',
    'belly pain': 'abdominal_pain',
    'loose stools': 'diarrhoea',
    'mild fever': 'mild_fever',
    'yellow pee': 'yellow_urine',
    'yellow eyes': 'yellowing_of_eyes',
    'liver failure': 'acute_liver_failure',
    'swelling belly': 'swelling_of_stomach',
    'swollen lymph nodes': 'swelled_lymph_nodes',
    'malaise': 'malaise',
    'blurred vision': 'blurred_and_distorted_vision',
    'sputum': 'phlegm',
    'eye redness': 'redness_of_eyes',
    'congested nose': 'congestion',
    'heart pain': 'chest_pain',
    'rapid heartbeat': 'fast_heart_rate',
    'anal pain': 'pain_in_anal_region',
    'dizzy': 'dizziness',
    'cramping': 'cramps',
    'obese': 'obesity',
    'swollen legs': 'swollen_legs',
    'puffy face': 'puffy_face_and_eyes',
    'swollen thyroid': 'enlarged_thyroid',
    'brittle nails': 'brittle_nails',
    'swelling in limbs': 'swollen_extremeties',
    'extreme hunger': 'excessive_hunger',
    'cheating': 'extra_marital_contacts',
    'tingling lips': 'drying_and_tingling_lips',
    'slurred speech': 'slurred_speech',
    'knee ache': 'knee_pain',
    'hip pain': 'hip_joint_pain',
    'muscle weakness': 'muscle_weakness',
    'neck stiffness': 'stiff_neck',
    'stiff movement': 'movement_stiffness',
    'dizzy spells': 'spinning_movements',
    'unsteady': 'unsteadiness',
    'smell loss': 'loss_of_smell',
    'urinary discomfort': 'bladder_discomfort',
    'bad smell in urine': 'foul_smell_of_urine',
    'constant urge to pee': 'continuous_feel_of_urine',
    'gas': 'passage_of_gases',
    'internal itch': 'internal_itching',
    'depressed': 'depression',
    'irritated': 'irritability',
    'muscle ache': 'muscle_pain',
    'altered mental state': 'altered_sensorium',
    'red spots': 'red_spots_over_body',
    'belly pain': 'belly_pain',
    'menstrual issues': 'abnormal_menstruation',
    'skin discoloration': 'dischromic_patches',
    'watery eyes': 'watering_from_eyes',
    'increased appetite': 'increased_appetite',
    'urinating frequently': 'polyuria',
    'family history': 'family_history',
    'cloudy mucus': 'mucoid_sputum',
    'rust-colored mucus': 'rusty_sputum',
    'poor concentration': 'lack_of_concentration',
    'visual problems': 'visual_disturbances',
    'blood transfusion': 'receiving_blood_transfusion',
    'unsterile injection': 'receiving_unsterile_injections',
    'coma': 'coma',
    'abdominal bleeding': 'stomach_bleeding',
    'abdominal distension': 'distention_of_abdomen',
    'alcohol use': 'history_of_alcohol_consumption',
    'fluid overload': 'fluid_overload',
    'blood in phlegm': 'blood_in_sputum',
    'veins on legs': 'prominent_veins_on_calf',
    'rapid heart rate': 'palpitations',
    'painful walk': 'painful_walking',
    'pimples': 'pus_filled_pimples',
    'blackheads': 'blackheads',
    'scarring': 'scurring',
    'peeling skin': 'skin_peeling',
    'dusty patches': 'silver_like_dusting',
    'nail dents': 'small_dents_in_nails',
    'inflamed nails': 'inflammatory_nails',
    'blister': 'blister',
    'sore around nose': 'red_sore_around_nose',
    'oozing yellow crust': 'yellow_crust_ooze',
    }
    
    
    # standardized_symptoms = []
    # for symptom in user_symptoms:
    #     standardized = synonyms.get(symptom.lower())
    #     if not standardized:
    #         matches = get_close_matches(symptom.lower(),symptoms_dict.keys(), n=1, cutoff=0.7)
    #         if matches:
    #             standardized = synonyms.get(matches[0])
    #         else:
    #             print(f"Unrecognized symptom: {symptom}")
    #     if standardized:
    #         standardized_symptoms.append(standardized)
    # return standardized_symptoms
    # Step 2: Standardize or correct user symptoms using fuzzy matching
def standardize_symptoms(user_symptoms):
    standardized_symptoms = []
    for symptom in user_symptoms:
        # First, try exact match in synonyms
        standardized_symptom = synonyms.get(symptom.lower())

        # If no exact synonym match, use fuzzy matching
        if not standardized_symptom:
            possible_matches = get_close_matches(symptom.lower(), symptoms_list.keys(), n=1, cutoff=0.7)
            if possible_matches:
                standardized_symptom = possible_matches[0]
                print(f"Interpreting '{symptom}' as '{standardized_symptom}'")
            else:
                print(f"Could not recognize symptom '{symptom}', please recheck.")

        if standardized_symptom:
            standardized_symptoms.append(standardized_symptom)

    return standardized_symptoms
    
       

# Function to get top N diseases and their probabilities
def get_top_n_diseases(user_symptoms, top_n=5):
    input_vector = ' '.join(user_symptoms)
    probabilities = text_clf.predict_proba([input_vector])[0]
    top_n_indices = np.argsort(probabilities)[-top_n:][::-1]
    top_n_diseases = [(text_clf.classes_[idx], probabilities[idx]) for idx in top_n_indices]
    return top_n_diseases

# # Helper function to fetch disease details
# def helper(disease):
#     desc = description_df[description_df['Disease'] == disease]['Description'].values
#     desc = " ".join(desc) if len(desc) > 0 else "No description available"

#     pre = precautions_df[precautions_df['Disease'] == disease][['Precaution_1', 'Precaution_2', 'Precaution_3', 'Precaution_4']].values.tolist()
#     pre = pre[0] if pre else ["No precautions available"]

#     med = medications_df[medications_df['Disease'] == disease]['Medication'].values.tolist()
#     med = med if med else ["No medications available"]

#     die = diets_df[diets_df['Disease'] == disease]['Diet'].values.tolist()
#     die = die if die else ["No diet information available"]

#     wrkout = workout_df[workout_df['disease'] == disease]['workout'].values.tolist()
#     wrkout = wrkout if wrkout else ["No workout suggestions available"]

#     return desc, pre, med, die, wrkout

# API endpoint for prediction
# @app.route('/predict', methods=['POST'])
# def predict():
#     data = request.json
#     symptoms = data.get('symptoms', [])
#     if not symptoms:
#         return jsonify({"error": "No symptoms provided"}), 400

#     # Standardize symptoms
#     user_symptoms = [s.strip() for s in symptoms.split(',')]
#     standardized_symptoms = standardize_symptoms(user_symptoms)

#     if not standardized_symptoms:
#         return jsonify({"error": "No recognized symptoms provided"}), 400

#     # Get top diseases
#     top_diseases = get_top_n_diseases(standardized_symptoms)

#     # Structure response
#     result = []
#     for disease, probability in top_diseases:
#         desc, pre, med, die, wrkout = helper(disease)
#         result.append({
#             'disease': disease,
#             'probability': round(probability, 2),
#             'description': desc,
#             'precautions': pre,
#             'medications': med,
#             'diets': die,
#             'workout': wrkout
#         })

#     return jsonify(result)


# @app.route('/predict', methods=['POST'])
# def predict():
#     data = request.json
#     symptoms = data.get('symptoms', [])
#     if not symptoms:
#         return jsonify({"error": "No symptoms provided"}), 400

#     # Standardize symptoms
#     user_symptoms = [s.strip() for s in symptoms.split(',')]
#     standardized_symptoms = standardize_symptoms(user_symptoms)

#     if not standardized_symptoms:
#         return jsonify({"error": "No recognized symptoms provided"}), 400

#     # Get top diseases
#     top_diseases = get_top_n_diseases(standardized_symptoms)

#     # Structure response
#     result = []
#     for disease, probability in top_diseases:
#         desc, pre, med, die, wrkout = helper(disease)
        
#         # Ensure consistent format even when information is missing
#         disease_info = {
#             'disease': disease,
#             'probability': round(probability, 2),
#             'description': desc if desc else "No description available",
#             'precautions': pre if pre else ["No precautions available"],
#             'medications': med if med else ["No medications available"],
#             'diets': die if die else ["No diet information available"],
#             'workout': wrkout if wrkout else ["No workout suggestions available"]
#         }
        
#         result.append(disease_info)

#     return jsonify(result)

# Helper function to fetch disease details
def helper(disease):
    desc = description_df[description_df['Disease'] == disease]['Description'].values
    desc = " ".join(desc) if len(desc) > 0 else "No description available"

    pre = precautions_df[precautions_df['Disease'] == disease][['Precaution_1', 'Precaution_2', 'Precaution_3', 'Precaution_4']].values.tolist()
    pre = pre[0] if pre else ["No precautions available"]
    pre = [p for p in pre if p and str(p) != 'nan']  # Remove NaN or None values

    med = medications_df[medications_df['Disease'] == disease]['Medication'].values.tolist()
    med = med if med else ["No medications available"]

    die = diets_df[diets_df['Disease'] == disease]['Diet'].values.tolist()
    die = die if die else ["No diet information available"]

    wrkout = workout_df[workout_df['disease'] == disease]['workout'].values.tolist()
    wrkout = wrkout if wrkout else ["No workout suggestions available"]

    return desc, pre, med, die, wrkout

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    symptoms = data.get('symptoms', [])
    if not symptoms:
        return jsonify({"error": "No symptoms provided"}), 400

    # Standardize symptoms
    user_symptoms = [s.strip() for s in symptoms.split(',')]
    standardized_symptoms = standardize_symptoms(user_symptoms)

    if not standardized_symptoms:
        return jsonify({"error": "No recognized symptoms provided"}), 400

    # Get top diseases
    top_diseases = get_top_n_diseases(standardized_symptoms)

    # Structure response
    result = []
    for disease, probability in top_diseases:
        desc, pre, med, die, wrkout = helper(disease)

        # Ensure consistent format even when information is missing
        disease_info = {
            'disease': disease,
            'probability': round(probability, 2),
            'description': desc if desc else "No description available",
            'precautions': pre if pre else ["No precautions available"],
            'medications': med if med else ["No medications available"],
            'diets': die if die else ["No diet information available"],
            'workout': wrkout if wrkout else ["No workout suggestions available"]
        }
        result.append(disease_info)

    return jsonify(result)



# def get_predicted_value(patient_symptoms):
#     input_vector = np.zeros(len(symptoms_dict))
#     for item in patient_symptoms:
#         input_vector[symptoms_dict.get(item, -1)] = 1
#     return diseases_list[model.predict([input_vector])[0]]

# def helper(dis):
#     desc = description_df[description_df['Disease'] == dis]['Description'].values
#     desc = " ".join(desc)

#     pre = precautions_df[precautions_df['Disease'] == dis][['Precaution_1', 'Precaution_2', 'Precaution_3', 'Precaution_4']].values.tolist()
#     med = medications_df[medications_df['Disease'] == dis]['Medication'].values.tolist()
#     die = diets_df[diets_df['Disease'] == dis]['Diet'].values.tolist()
#     wrkout = workout_df[workout_df['disease'] == dis]['workout'].values.tolist()

#     return desc, pre, med, die, wrkout



# # Route for general disease prediction

# @app.route('/predict', methods=['POST'])
# def predict():
#     data = request.json
#     symptoms = data.get('symptoms', [])
#     user_symptoms = [s.strip() for s in symptoms.split(',')]
#     user_symptoms = [symptom.strip("[]' ") for symptom in user_symptoms]

#     predicted_disease = get_predicted_value(user_symptoms)
#     desc, pre, med, die, wrkout = helper(predicted_disease)

#     result = {
#         'predicted_disease': predicted_disease,
#         'description': desc,
#         'precautions': pre,
#         'medications': med,
#         'diets': die,
#         'workout': wrkout
#     }

#     return jsonify(result)






# Route for Parkinson's disease prediction
@app.route('/predict_parkinsons', methods=['POST'])
def predict_parkinsons():
    data = request.json  # This should be a dictionary if sent correctly

    # If the incoming data is a list instead of a dictionary
    if isinstance(data, list):
        input_data = data  # Directly use the list
    else:
        input_data = data.get('input_data', [])

    print(input_data)

    # Convert input data to numpy array and reshape it for the model
    input_data_as_numpy_array = np.asarray(input_data).reshape(1, -1)
    # Predict using the Parkinson's model
    prediction = parkinsons_model.predict(input_data_as_numpy_array)

    if prediction[0] == 0:
        result = "The Person does not have Parkinson's Disease"
    else:
        result = "The Person has Parkinson's Disease,Please Contact a Doctor"

    return jsonify({'parkinsonsdisease_prediction': result})

# Route for heart disease prediction
@app.route('/predict_heart_disease', methods=['POST'])
def predict_heart_disease():
    data = request.json  # This should be a dictionary if sent correctly

    # If the incoming data is a list instead of a dictionary
    if isinstance(data, list):
        input_data = data  # Directly use the list
    else:
        input_data = data.get('input_data', [])

    #print(input_data)

    # Convert input data to numpy array and reshape it for the model
    input_data_as_numpy_array = np.asarray(input_data).reshape(1, -1)

    # Predict using the heart disease model
    prediction = heart_disease_model.predict(input_data_as_numpy_array)

    if prediction[0] == 0:
        result = "The Person does not have Heart Disease,Please Contact a Doctor"
    else:
        result = "The Person has Heart Disease"

    return jsonify({'heartdisease_prediction': result})



# Route for diabetes prediction
@app.route('/predict_diabetes', methods=['POST'])
def predict_diabetes():
    data = request.json  # This should be a dictionary if sent correctly

    # If the incoming data is a list instead of a dictionary
    if isinstance(data, list):
        input_data = data  # Directly use the list
    else:
        input_data = data.get('input_data', [])

    #print(input_data)

    # Convert input data to numpy array and reshape it for the model
    input_data_as_numpy_array = np.asarray(input_data).reshape(1, -1)

    # Make prediction
    prediction = diabetes_model.predict(input_data_as_numpy_array)

    if prediction[0] == 0:
        result = "The person is not diabetic"
    else:
        result = "The person is diabetic,Please Contact a Doctor"

    return jsonify({'diabetes_prediction': result})

@app.route('/predict-insurance', methods=['POST'])
def predict_insurance():
    try:
        data = request.get_json()
        print("Received JSON:", data)

        # Extract and preprocess input values
        age = int(data['age'])
        bmi = float(data['bmi'])
        children = int(data['children'])
        smoker = 1 if data['smoker'].lower() == 'yes' else 0

        # sex and region are not used for prediction
        input_df = pd.DataFrame([{
            'age': age,
            'bmi': bmi,
            'children': children,
            'smoker': smoker
        }])

        print("Prepared DataFrame:", input_df)

        # Make prediction
        prediction = insurance_model.predict(input_df)[0]
        print("Prediction:", prediction)

        # Convert to native float before returning
        return jsonify({'prediction': round(float(prediction), 2)})

    except Exception as e:
        print("Error:", e)
        return jsonify({'error': str(e)}), 400



if __name__ == '__main__':
    app.run(
        host="0.0.0.0",
        port=int(PORT),
        debug=False
    )
