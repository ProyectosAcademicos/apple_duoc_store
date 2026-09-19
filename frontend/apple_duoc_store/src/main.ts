import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Amplify } from 'aws-amplify';

Amplify.configure({ // se encarga de todo lo necesario para que se llame cognito
  Auth:{
    Cognito:{
      userPoolId: 'us-east-1_W4aDnNWHv',
      userPoolClientId : '333nflqmbqav5orp0riieii2s5',
      loginWith:{
        oauth:{
          domain: 'us-east-1w4adnnwhv.auth.us-east-1.amazoncognito.com',
          scopes:[
            'email',
            'openid',
            'profile',
            'applestoreapi/api-apple-read'
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