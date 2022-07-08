import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CodeblockControl, TextareaControl, HeaderControl, FieldType } from '../../interfaces';
import { Firestore, doc, getDoc, connectFirestoreEmulator, setDoc, EmulatorMockTokenOptions, collection, collectionData, collectionChanges, collectionGroup, addDoc, DocumentReference, DocumentData, updateDoc, CollectionReference, DocumentSnapshot, query, getDocs } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { FirebaseService } from 'src/app/services/firebase-service.service';

export type dynamicObject = { [ key: string ]: any; };

@Component({
  selector: 'app-create-article',
  templateUrl: './create-article.component.html',
  styleUrls: ['./create-article.component.css']
})
export class CreateArticleComponent implements OnInit
{
  	constructor(private firestore: Firestore, private router: Router) {}

	ngOnInit(): void
	{

	}

  	codeblockArray: CodeblockControl[] = [];
  	textareaArray: TextareaControl[] = [];
  	headerArray: HeaderControl[] = [];

	public index: number = 0;

	public articleControl: FormGroup = new FormGroup({
		articleID: new FormControl(''),
		title: new FormControl('', Validators.required),
		author: new FormControl(''),
		date: new FormControl(''),
		category: new FormControl(''),
		tags: new FormArray([]),
		content: new FormArray([])
	});

	add_field(fieldType: FieldType): void
	{
		let num: number = this.index++;
		let content = this.articleControl.get('content') as FormArray;
		switch (fieldType)
		{
			case FieldType.Textarea:
				let textareaGroup = new FormGroup({
					index: new FormControl(Number(num)),
					type: new FormControl(FieldType.Textarea),
					text: new FormControl(''),
					font_size: new FormControl(16),
					font_style: new FormControl('normal'),
					link: new FormGroup({
						text: new FormControl(''),
						url: new FormControl('')
					})
				});
				this.textareaArray.push(textareaGroup as TextareaControl);
				content.push(textareaGroup);
				break;

			case FieldType.Codeblock:
				let codeblockControl = new FormGroup({
					index: new FormControl(Number(num)),
					type: new FormControl(FieldType.Codeblock),
					text: new FormControl(''),
					font_size: new FormControl(16),
					language: new FormControl('cs')
				});
				this.codeblockArray.push(codeblockControl as CodeblockControl);
				content.push(codeblockControl);
				break;

			case FieldType.Header:
				let headerControl = new FormGroup({
					index: new FormControl(Number(num)),
					type: new FormControl(FieldType.Header),
					text: new FormControl(''),
					header_level: new FormControl(0)
				});
				this.headerArray.push(headerControl as HeaderControl);
				content.push(headerControl);
				break;
		}
	}

	public submit_article(): void
	{
		if (!this.articleControl.valid)
		{
			console.error("Not Valid!");
			return;
		}

		// this.uploadArticle().then(() => this.router.navigate(['/article'], { queryParams: { articleID: this.articleControl.get('articleID')?.value } }));
		this.uploadArticle();
	}

	private async uploadArticle(): Promise<DocumentReference>
	{
		const articlesRef = collection(this.firestore, 'articles');
		return await addDoc(articlesRef, this.articleControl.value).then(async (documentData) =>
		{
			await updateDoc(documentData, { articleID: documentData.id });
			this.articleControl.get('articleID')?.setValue(documentData.id);
			return await this.uploadCategory(documentData.id);
		});
	}

	private async uploadCategory(articleID: string): Promise<any>
	{
		const articleCategory: object | string = this.articleControl.get('category')?.value;
		const articleTitle: string = this.articleControl.get('title')?.value;
		const builtCategoryObj = this.buildCategoryObject(articleCategory, articleID, articleTitle);
		const categoryPath: string[] = this.getKeys(builtCategoryObj);
		const categoryKey = this.convertToKey(categoryPath);

		const categoryDocRef = doc(this.firestore, 'sidebar-content', categoryKey);
		const categoryDocSnap = await getDoc(categoryDocRef);

		let endpointObj: dynamicObject = {};
		endpointObj[ articleID ] = articleTitle;

		if (categoryDocSnap.exists())
		{
			return await updateDoc(categoryDocRef, endpointObj);
		}
		else
		{
			return await setDoc(categoryDocRef, endpointObj);
		}
	}

	private async exists(documentRef: DocumentReference<DocumentData> | CollectionReference<DocumentData>): Promise<boolean>
	{
		return await new Promise<boolean>(async(resolve) =>
		{
			let snapshot: DocumentSnapshot<DocumentData> | Observable<DocumentData[]>
			if (documentRef instanceof DocumentReference)
			{
				snapshot = await getDoc(documentRef);
				if (snapshot.exists())
				{
					resolve(true);
				}
				else
				{
					resolve(false);
				}
			}
			else
			{
				snapshot = collectionData(documentRef);
				snapshot.forEach(documentDataArray => documentDataArray.length > 0 ? resolve(true) : resolve(false));
			}
		});
	}

	private async getCategoryPath(categoryName: string, currentPath: string[] = []): Promise<string[]>
	{
		return await new Promise<string[]>(async (resolve, reject) =>
		{
			const output: string[] = [];

			let currentCollection: any;

			if (currentPath.length > 0)
			{
				currentCollection = collection(this.firestore, 'sidebar-content', ...currentPath);
			}
			else
			{
				currentCollection = collection(this.firestore, 'sidebar-content');
			}
			const currentCollectionData = collectionData(currentCollection);
			currentCollectionData.forEach(documentDataArray =>
			{
				for (const documentData of documentDataArray)
				{

				}
			});

			resolve(output);
		});
	}

	private getKeys(inputValue: object): string[]
	{
		const output: string[] = [];

		for (const property of Object.entries(inputValue))
		{
			if (typeof property[ 1 ] != 'object')
			{
				continue;
			}

			output.push(property[ 0 ]);

			for (const key of this.getKeys(property[ 1 ]))
			{
				output.push(key);
			}
		}

		return output;
	}

	private convertToKey(categoryStrings: string[]): string
	{
		let output: string = "";
		for (const categoryString of categoryStrings)
		{
			if (output.length == 0)
			{
				output += categoryString;
				continue;
			}

			output += ':' + categoryString;
		}
		return output;
	}

	private buildCategoryObject(inputValue: any, articleID: string, articleTitle: string): object
	{
		let output: dynamicObject = {};

		if (typeof inputValue === 'string')
		{
			let endpointObj: dynamicObject = {};
			endpointObj[ articleID ] = articleTitle;
			output[ inputValue ] = endpointObj;
		}

		if (typeof inputValue === 'object')
		{
			for (const property of Object.entries(inputValue))
			{
				output[ property[ 0 ] ] = this.buildCategoryObject(property[ 1 ], articleID, articleTitle);
			}
		}

		return output;
	}

	public update_index(newIndex: number, content: any): void
	{
		content.value.index = Number(newIndex);
	}

	public get tags(): FormArray
	{
		return this.articleControl.controls[ 'tags' ] as FormArray;
	}
}
