import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AboutComponent } from './components/about/about.component';
import { ArticleComponent } from './components/article/article.component';
import { ContentListComponent } from './components/content-list/content-list.component';
import { CreateArticleComponent } from './components/create-article/create-article.component';
import { HomeComponent } from './components/home/home.component';
import { InputTableComponent } from './components/input-table/input-table.component';

const routes: Routes = [
	{ path: "", component: HomeComponent },
	{ path: "article", component: ArticleComponent },
	{ path: "article/create", component: CreateArticleComponent },
	{ path: "about", component: AboutComponent},
	{ path: "contentlist", component: ContentListComponent},

	{path: "**", redirectTo: ""},
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
