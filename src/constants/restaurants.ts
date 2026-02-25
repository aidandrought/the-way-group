export type RestaurantId = 'mill-creek' | 'everett' | 'mukilteo';

export const RESTAURANTS: Array<{ id: RestaurantId; name: string }> = [
  { id: 'mill-creek', name: 'Tapped Mill Creek' },
  { id: 'everett', name: 'Tapped POE' },
  { id: 'mukilteo', name: 'Tapped Mukilteo' },
];
