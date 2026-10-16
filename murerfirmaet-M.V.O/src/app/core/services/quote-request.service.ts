import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {API_BASE_URL} from '../config/api.config';

export interface QuoteRequest {
  name: string;
  phone: string;
  email: string;
  category: string;
  message: string;
  /** Hidden honeypot field; real visitors leave it empty. */
  website: string;
  files: File[];
}

/** Sends the quote form to the backend, which emails the firm and the customer. */
@Injectable({providedIn: 'root'})
export class QuoteRequestService {
  private readonly http = inject(HttpClient);

  send(request: QuoteRequest): Observable<void> {
    const body = new FormData();
    body.append('name', request.name);
    body.append('phone', request.phone);
    body.append('email', request.email);
    body.append('category', request.category);
    body.append('message', request.message);
    body.append('website', request.website);
    for (const file of request.files) body.append('files', file, file.name);
    return this.http.post<void>(`${API_BASE_URL}/api/contact/quote`, body);
  }
}
