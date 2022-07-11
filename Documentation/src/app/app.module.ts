import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { DropdownComponent } from './components/dropdown/dropdown.component';
import { ArticleComponent } from './components/article/article.component';
import { CreateArticleComponent } from './components/create-article/create-article.component';
import { ArticleContentComponent } from './components/article-content/article-content.component';
import { InputFieldComponent } from './components/input-field/input-field.component';
import { InputFieldareaComponent } from './components/input-fieldarea/input-fieldarea.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { InputStaticFieldComponent } from './components/input-static-field/input-static-field.component';
import { HttpClientModule } from '@angular/common/http';
import { InputFieldmenuComponent } from './components/input-fieldmenu/input-fieldmenu.component';
import { HomeComponent } from './components/home/home.component';
import { MenuItemComponent } from './components/input-fieldmenu/menu-item/menu-item.component';
import { InputFieldarrayComponent } from './components/input-fieldarray/input-fieldarray.component';
import { AboutComponent } from './components/about/about.component';
import { initializeApp,provideFirebaseApp } from '@angular/fire/app';
import { environment } from '../environments/environment';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { ConfirmInputFieldComponent } from './components/confirm-input-field/confirm-input-field.component';
import { ContentListComponent } from './components/content-list/content-list.component';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

@NgModule({
  	declarations: [
  	 	AppComponent,
  	 	HeaderComponent,
  	 	SidebarComponent,
  	 	DropdownComponent,
  	 	ArticleComponent,
  	 	CreateArticleComponent,
  	 	ArticleContentComponent,
  	 	InputFieldComponent,
  	 	InputFieldareaComponent,
  	 	InputStaticFieldComponent,
  	 	InputFieldmenuComponent,
  	 	HomeComponent,
  	 	MenuItemComponent,
  	 	InputFieldarrayComponent,
  	 	AboutComponent,
     ConfirmInputFieldComponent,
     ContentListComponent
  	],
  	imports: [BrowserModule, AppRoutingModule, ReactiveFormsModule, FormsModule, HttpClientModule, provideFirebaseApp(() => initializeApp(environment.firebase)), provideFirestore(() => getFirestore())],
	providers: [{provide: LocationStrategy, useClass: HashLocationStrategy}],
	bootstrap: [AppComponent],
})
export class AppModule {}
