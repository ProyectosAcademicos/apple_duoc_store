import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Amplify } from 'aws-amplify';

Amplify.configure({ // se encarga de todo lo necesario para que se llame cognito
  Auth:{
    Cognito:{
      userPoolId: 'us-east-1_Rz7VXo01Y',
      userPoolClientId : 'c8eu46ap36i4m5l4kn54u3l39',
      loginWith:{
        oauth:{
          domain: 'us-east-1rz7vxo01y.auth.us-east-1.amazoncognito.com',
          scopes:[
            'email',
            'openid',
            'profile',
            'apple-productos-duoc/read-productos'
          ],
          redirectSignIn:[
            'http://localhost:4200'
          ],
          redirectSignOut:[
            'http://localhost:4200'
          ],
          responseType:'code'
        }
      }
    }
  }
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));