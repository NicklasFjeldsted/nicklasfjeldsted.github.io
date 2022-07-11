import { Component, OnInit } from '@angular/core';
import { collection, collectionData, collectionGroup, Firestore, doc, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'content-list',
  templateUrl: './content-list.component.html',
  styleUrls: ['./content-list.component.css']
})
export class ContentListComponent implements OnInit {

  constructor(private firestore: Firestore) { }

  ngOnInit(): void {
  }

  getData(): void {
    const articles = collection(this.firestore, 'articles');
    const categoryCollection = collection(this.firestore, 'sidebar-content');
    const categoryDocuments = collectionData(categoryCollection, { idField: 'path' });
  }

}
