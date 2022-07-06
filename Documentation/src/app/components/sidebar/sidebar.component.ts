import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { DropdownComponent } from '../dropdown/dropdown.component';

@Component({
  selector: 'sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, AfterViewInit {

	constructor(private firestore: Firestore) { }


	public data: object = {};

	@Input() open!: boolean;

	@Output() output: EventEmitter<void> = new EventEmitter<void>();

	@ViewChild('dropdownRef') dropdownRef!: DropdownComponent;

	public DataSubject!: BehaviorSubject<object>;
	public DataObservable!: Observable<object>;

	ngOnInit(): void
	{
		this.loadSidebar();
		this.DataSubject = new BehaviorSubject<object>({});
		this.DataObservable = this.DataSubject.asObservable();
	}

	ngAfterViewInit(): void
	{
		this.DataObservable.subscribe(data =>
			{
				this.dropdownRef.updateContent(data);
				this.data = data;
			});
	}

	public loadSidebar(): void
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

	public Emit(): void
	{
		this.output.emit();
	}

}
