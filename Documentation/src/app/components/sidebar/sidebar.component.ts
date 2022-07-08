import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { collection, collectionData, collectionGroup, Firestore, getDocs } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { FirebaseService } from 'src/app/services/firebase-service.service';
import { DropdownComponent } from '../dropdown/dropdown.component';

@Component({
  selector: 'sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, AfterViewInit {

	constructor(private firestore: Firestore, private fireService: FirebaseService) { }


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
		this.fireService.getAllCategories().then(categories => this.DataSubject.next(categories));
	}

	public Emit(): void
	{
		this.output.emit();
	}

}
