import { Component, InjectionToken, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import hljs from 'highlight.js';
import { Article } from '../../interfaces';
import { collection, collectionData, connectFirestoreEmulator, doc, Firestore, getDoc, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-article',
  templateUrl: './article.component.html',
  styleUrls: ['./article.component.css']
})
export class ArticleComponent implements OnInit {

	constructor(private route: ActivatedRoute, private router: Router, private firestore: Firestore) { }

	public article!: Article;
	public categoryArticles: any[] = [];
	public contentListArticles: string[] = [];

	ngOnInit(): void
	{
		this.route.queryParams.subscribe(params =>
			{
				if (params[ 'articleID' ] === undefined)
				{
					this.router.navigate([ '/' ]);
				}
				this.load_data(params[ 'articleID' ]);
				const ref = doc(this.firestore, 'articles', params[ 'articleID' ]);
            const docSnap = getDoc(ref);
            docSnap.then(data =>
            {
                if (data.exists())
                {
                    const docObj = <Article>data.data();
                    const headers = docObj.content.filter(y => y.type == 2);
                    headers.forEach(head => this.contentListArticles.push(head.text));
                }
            });
		});
	}

	public load_data(articleID: string): void
	{
		this.loadArticle(articleID).then((articleData) =>
		{
			this.article = articleData;

			this.categoryArticles = [];

			// for (const pair of Object.entries(sidebarContent))
			// {
			// 	this.set_navigation({ key: pair[ 0 ], value: pair[ 1 ] });
			// }
			// this.currentArticleIndex = this.categoryArticles.indexOf(this.article.title);
			setTimeout(() => hljs.highlightAll(), 10);
		}).catch((reason) => console.error(reason));
	}

	private async loadArticle(articleID: string): Promise<Article>
	{
		return await new Promise<Article>(async(resolve, reject) =>
		{
			const articlesRef = collection(this.firestore, 'articles');
			collectionData(articlesRef).forEach(arr =>
			{
				for (const docData of arr)
				{
					if (docData[ 'articleID' ] != articleID)
					{
						continue;
					}
					resolve(<Article>docData);
				}
			});
		});
	}


	public get_date(): Date
	{
		return new Date(this.article.date);
	}

	public currentArticleIndex: number = 0;

	public navigate(direction: number): void
	{
		this.currentArticleIndex += direction;
		this.router.navigate([ '/article' ], { queryParams: { title: this.categoryArticles[ this.currentArticleIndex ] } })
	}

	private set_navigation(obj: { key: string, value: string | object; }): void
	{
		if (typeof obj.value === 'string')
		{
			this.categoryArticles.push(obj.value);
		}

		if (typeof obj.value === 'object')
		{
			for (const property of Object.entries(obj.value))
			{
				this.set_navigation({key: property[0], value: property[1]});
			}
		}
	}

	public get_component_path(input: string | object): string
	{
		let output: string = "Error::InvalidCategory";

		if (typeof input === 'string')
		{
			output = "";
			output += input;
		}

		if (typeof input === 'object')
		{
			output = "";
			for (const pair of Object.entries(input))
			{
				output += pair[ 0 ];

				if (typeof pair[ 1 ] === 'string')
				{
					output += " > " + pair[ 1 ];
				}

				if (typeof pair[ 1 ] === 'object')
				{
					output += " > " + this.get_component_path(pair[ 1 ]);
				}
			}
		}

		return output;
	}
}

