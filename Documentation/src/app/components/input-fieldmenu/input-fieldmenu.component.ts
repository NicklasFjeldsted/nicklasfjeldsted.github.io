import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { FormGroup } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';

@Component({
  selector: 'input-fieldmenu',
  templateUrl: './input-fieldmenu.component.html',
  styleUrls: ['./input-fieldmenu.component.css']
})
export class InputFieldmenuComponent implements OnInit, AfterViewInit
{
	constructor(private firestore: Firestore) { }

	@Input() group!: FormGroup;

	@Input() placeholder: string = "Empty Placeholder..";
	@Input() label: string = "Empty Label";
	@Input() name: string = "Empty Name";

	@ViewChild('arrow') arrowElement!: ElementRef;
	@ViewChild('menuBtn') menuButtonElement!: ElementRef;
	@ViewChild('selectionInput') selectionInputElement!: ElementRef;

	public isActive: boolean = false;

	public selected: string = "";

	public categories: IterableObject[] = [];

	public DataSubject!: BehaviorSubject<object>;
	public DataObservable!: Observable<object>;

	ngOnInit(): void
	{
		this.DataSubject = new BehaviorSubject<object>({});
		this.DataObservable = this.DataSubject.asObservable();
		this.loadCategories();
	}

	ngAfterViewInit(): void
	{
		this.DataObservable.subscribe(data => this.load(data));
	}

	private load(newData: object): void
	{
		this.categories = [];
		for (const property of Object.entries(newData))
		{
			if (typeof property[ 1 ] === 'string')
			{
				continue;
			}

			this.categories.push(this.setMenu({ key: property[ 0 ], value: property[ 1 ] }));
		}
	}

	public loadCategories(): void
	{
		const collectionRef = collection(this.firestore, 'sidebar-content');
		const collectionSnap = collectionData(collectionRef, { idField: 'key' });
		let data: { [ key: string ]: any; } = {};
		collectionSnap.subscribe(arr =>
		{
			for (let i = 0; i < arr.length; i++)
			{
				data[ arr[ i ][ 'key' ] ] = arr[ i ];
			}
			this.DataSubject.next(data);
		});
	}

	private setMenu(obj: JsonObject): IterableObject
	{
		let output: IterableObject = { name: obj.key, children: [] };

		if (typeof obj.value === 'object')
		{
			for (const property of Object.entries(obj.value))
			{
				if (typeof property[ 1 ] === 'string')
				{
					continue;
				}

				output.children.push(this.setMenu({ key: property[ 0 ], value: property[ 1 ] }));
			}
		}

		return output;
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

	public receiveValue(value: IterableObject): void
	{
		this.setState(false);
		let convertedValue: { [ key: string ]: any; } | string = {};
		if (value.children.length > 0)
		{
			convertedValue[ value.name ] = this.convertIterableObject(value);
		}
		else
		{
			convertedValue = value.name;
		}
		this.group.get('category')?.setValue(convertedValue);
	}

	private convertIterableObject(value: IterableObject): { [ key: string ]: any; } | string
	{
		let output: { [ key: string ]: any; } | string = {};

		for (const child of value.children)
		{
			if (child.children.length <= 0)
			{
				output = child.name;
				break;
			}
			else
			{
				output[ child.name ] = this.convertIterableObject(child);
			}
		}

		if (value.children.length <= 0)
		{
			output = value.name;
		}

		return output;
	}

	public setState(state: boolean): void
	{
		this.isActive = state;
		this.isActive ? this.arrowElement.nativeElement.classList.add('rotated') : this.arrowElement.nativeElement.classList.remove('rotated');
		this.isActive ? this.menuButtonElement.nativeElement.classList.add('open') : this.menuButtonElement.nativeElement.classList.remove('open');
		this.isActive ? this.selectionInputElement.nativeElement.classList.add('open') : this.selectionInputElement.nativeElement.classList.remove('open');
	}

	public confirm(value: any): void
	{
		let newCategory: IterableObject = { name: value, children: [] }

		this.categories.push(newCategory);
		this.receiveValue(newCategory);
	}

	public cancel(value: any): void
	{

	}
}

export type JsonObject = { key: string, value: object | string; };
export type IterableObject = { name: string; children: IterableObject[]; };
