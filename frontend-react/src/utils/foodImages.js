const FOOD_IMAGE_OVERRIDES = [
  { match: 'кока-кола', url: '/food/cola.png' },
  { match: 'кола 0.5', url: '/food/cola.png' },
  { match: 'попкорн карамельный', url: '/food/popcorn-caramel.png' },
  { match: 'попкорн (большой)', url: '/food/ember-popcorn.png' },
  { match: 'попкорн большой', url: '/food/ember-popcorn.png' },
  { match: 'минеральная вода', url: '/food/water.png' },
  { match: 'начос с сыром', url: '/food/nachos-ember.png' },
  { match: 'хот-дог классический', url: '/food/hotdog-ember.png' },
  { match: 'хот дог классический', url: '/food/hotdog-ember.png' },
  { match: 'мороженое пломбир', url: '/food/icecream.png' },
  { match: 'комбо премиум', url: '/food/combo-premium.png' },
  { match: 'комбо «премиум»', url: '/food/combo-premium.png' },
];

export function getFoodImageUrl(item) {
  if (!item) return '/food/ember-popcorn.png';
  if (item.name) {
    const name = String(item.name).toLowerCase();
    const found = FOOD_IMAGE_OVERRIDES.find((x) => name.includes(x.match));
    if (found) return found.url;
  }
  if (item.imageUrl?.startsWith('/food/')) return item.imageUrl;
  return `/food/ember-popcorn.png`;
}

export function isColaFoodItem(name) {
  const lower = String(name || '').toLowerCase();
  return lower.includes('кока-кола') || lower.includes('cola') || lower.includes('кола 0.5');
}
