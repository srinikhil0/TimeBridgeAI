import firebase_admin
from firebase_admin import credentials, auth
import os
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

def get_id_token(custom_token):
    FIREBASE_WEB_API_KEY = os.getenv('FIREBASE_WEB_API_KEY')
    
    try:
        response = requests.post(
            'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken',
            params={'key': FIREBASE_WEB_API_KEY},
            json={'token': custom_token, 'returnSecureToken': True}
        )
        response.raise_for_status()
        return response.json()['idToken']
    except Exception as e:
        print(f"Error exchanging custom token: {str(e)}")
        print(f"Response content: {response.text if 'response' in locals() else 'No response'}")
        return None

def generate_token():
    try:
        # Initialize Firebase Admin
        cred = credentials.Certificate(os.getenv('FIREBASE_CREDENTIALS_PATH'))
        try:
            firebase_admin.initialize_app(cred)
        except ValueError:
            # App already initialized
            pass
        
        # Create a test user
        try:
            user = auth.create_user(
                email='test@example.com',
                password='testpassword123'
            )
        except auth.EmailAlreadyExistsError:
            # If user exists, get the user
            user = auth.get_user_by_email('test@example.com')
        
        # Create custom token
        custom_token = auth.create_custom_token(user.uid)
        
        # Exchange for ID token
        id_token = get_id_token(custom_token.decode())
        
        if id_token:
            print("\nTest User Details:")
            print(f"Email: test@example.com")
            print(f"UID: {user.uid}")
            print(f"\nID Token (use this in Authorization header):")
            print(f"Bearer {id_token}\n")
            return id_token
        else:
            print("Failed to get ID token")
            return None
        
    except Exception as e:
        print(f"Error generating token: {str(e)}")
        return None

if __name__ == "__main__":
    generate_token() 