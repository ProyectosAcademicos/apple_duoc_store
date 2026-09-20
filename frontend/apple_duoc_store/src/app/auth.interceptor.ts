import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { fetchAuthSession } from 'aws-amplify/auth';
import { catchError, defer, switchMap, throwError } from 'rxjs';

// Solo las peticiones de nuestra API que lo indiquen reciben el Access Token.
export const REQUIERE_AUTENTICACION = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.context.get(REQUIERE_AUTENTICACION)) {
    return next(req);
  }

  return defer(() => fetchAuthSession()).pipe(
    catchError((error: unknown) => {
      if (error instanceof Error &&
        ['UserUnAuthenticatedException', 'NotAuthorizedException'].includes(error.name)) {
        return throwError(() => new HttpErrorResponse({ status: 401 }));
      }
      return throwError(() => error);
    }),
    switchMap(session => {
      const token = session.tokens?.accessToken?.toString();
      if (!token) {
        return throwError(() => new HttpErrorResponse({ status: 401 }));
      }
      return next(req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      }));
    })
  );
};
