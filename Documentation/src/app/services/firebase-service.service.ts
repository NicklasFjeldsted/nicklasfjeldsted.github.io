import { Injectable } from '@angular/core';
import { Firestore, getDoc, getDocs, doc, collection, collectionData, DocumentData } from '@angular/fire/firestore';
import { dynamicObject } from '../components/create-article/create-article.component';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService
{
	constructor(private firestore: Firestore) { }

	public async getAllCategories(): Promise<object>
	{
		return await new Promise<object>(resolve =>
		{
			const categoryCollection = collection(this.firestore, 'sidebar-content');
			const categoryDocuments = collectionData(categoryCollection, { idField: 'path' });

			categoryDocuments.forEach(documents =>
			{
				let output: dynamicObject = {};
				const data: dynamicObject[] = [];
				for (const documentData of documents)
				{
					let path: string[] = documentData[ 'path' ].split(':');
					let values: dynamicObject = {};
					for (const property of Object.entries(documentData))
					{
						if (property[ 0 ] == 'path')
						{
							property[ 0 ] = path[ path.length - 1 ];
							continue;
						}
						values[ property[ 0 ] ] = property[ 1 ];
					}
					data.push(this.getObject(path, values));
				}
				for (let i = 0; i < data.length; i++)
				{
					output = this.mergeObjects(output, data[ i ]);
					console.log(i, data[i]);
				}
				_.merge(output, ...data);
				console.log(output);
				resolve(output);
			});
		});
	}

	private getObject(path: string[], value: dynamicObject): object
	{
		let output: dynamicObject = {};

		let passAlongPath: string[] = [];
		for (let i = 0; i < path.length; i++)
		{
			if (i == 0)
			{
				continue;
			}
			passAlongPath.push(path[ i ]);
		}

		if (path.length > 0)
		{
			output[ path[ 0 ] ] = this.getObject(passAlongPath, value);
		}

		if (path[ 0 ] == value[ 'path' ])
		{
			for (const property of Object.entries(value))
			{
				if (property[ 0 ] == 'path')
				{
					continue;
				}

				output[ property[ 0 ] ] = property[ 1 ];
			}
		}

		return output;
	}

	public mergeObjects(target: dynamicObject, source: dynamicObject): object
	{
		let output: dynamicObject = {};

		return output;
	}
}
