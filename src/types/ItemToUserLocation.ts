// src/types/ItemToUserLocation.ts

import { DateContainer } from "./Timesheet";

/**
 * A many-to-many link between an Item, a UserLocation and a TaxLocation.
 * Supports Add, Read, Modify, Upsert, Delete.
 */
export interface ItemToUserLocation {
  id: string;
  itemid: string;
  user_locationid: string;
  tax_locationid: string;
  created: DateContainer;
  updated: DateContainer;
}

export interface ItemToUserLocationWrapper {
  ItemToUserLocation: ItemToUserLocation;
}
