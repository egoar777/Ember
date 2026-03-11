// Локальные картинки из public/food — не блокируются хостингами
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
  if (!item) return 'https://picsum.photos/seed/food/160/160';
  if (item.name) {
    const name = String(item.name).toLowerCase();
    const found = FOOD_IMAGE_OVERRIDES.find((x) => name.includes(x.match));
    if (found) return found.url;
  }
  if (item.imageUrl) return item.imageUrl;
  return `https://picsum.photos/seed/f${item.id}/160/160`;
}
