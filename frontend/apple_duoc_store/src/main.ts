import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Amplify } from 'aws-amplify';

Amplify.configure({ // se encarga de todo lo necesario para que se llame cognito
  Auth:{
    Cognito:{
      userPoolId: 'us-east-1_RboQoD7j7',
      userPoolClientId : '347a6dgttns44mofct7p8vjavs',
      loginWith:{
        oauth:{
          domain: 'us-east-1rboqod7j7.auth.us-east-1.amazoncognito.com',
          scopes:[
            'email',
            'openid',
            'profile',
            'rs-api-pedidos/pedidos-read'
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