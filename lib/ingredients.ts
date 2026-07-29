export const shoppingCategories = [
  'Fruit & Veg',
  'Meat & Fish',
  'Dairy & Eggs',
  'Bakery',
  'Tins & Jars',
  'Cupboard',
  'Freezer',
  'Drinks',
  'Snacks',
  'Household',
  'Toiletries',
  'Pets',
  'Other',
] as const

export type ShoppingCategory = (typeof shoppingCategories)[number]

export type CategorisedIngredient = {
  category: ShoppingCategory
  item: string
}

const legacyCategoryNames: Record<string, ShoppingCategory> = {
  'meat & fish': 'Meat & Fish',
  'fruit & veg': 'Fruit & Veg',
  fridge: 'Dairy & Eggs',
  freezer: 'Freezer',
  cupboard: 'Cupboard',
  bakery: 'Bakery',
  drinks: 'Drinks',
  snacks: 'Snacks',
  household: 'Household',
  dog: 'Pets',
  pets: 'Pets',
  other: 'Other',
}

const categoryRules: Array<{
  category: ShoppingCategory
  words: string[]
}> = [
  {
    category: 'Pets',
    words: [
      'dog food',
      'cat food',
      'pet food',
      'dog treat',
      'cat treat',
      'cat litter',
      'rabbit food',
      'hamster food',
    ],
  },
  {
    category: 'Household',
    words: [
      'toilet roll',
      'kitchen roll',
      'washing powder',
      'washing liquid',
      'dishwasher',
      'bin bag',
      'cleaner',
      'bleach',
      'foil',
      'cling film',
      'sponge',
    ],
  },
  {
    category: 'Toiletries',
    words: [
      'shampoo',
      'conditioner',
      'toothpaste',
      'toothbrush',
      'deodorant',
      'soap',
      'shower gel',
      'nappy',
      'nappies',
      'sanitary',
    ],
  },
  {
    category: 'Freezer',
    words: [
      'frozen',
      'ice cream',
      'fish finger',
      'oven chip',
      'french fries',
    ],
  },
  {
    category: 'Meat & Fish',
    words: [
      'chicken',
      'beef',
      'mince',
      'pork',
      'bacon',
      'sausage',
      'ham',
      'turkey',
      'lamb',
      'steak',
      'salmon',
      'tuna',
      'cod',
      'haddock',
      'prawn',
      'fish',
    ],
  },
  {
    category: 'Tins & Jars',
    words: [
      'tin',
      'tinned',
      'chopped tomatoes',
      'passata',
      'pasta sauce',
      'cooking sauce',
      'jar',
      'baked beans',
      'coconut milk',
    ],
  },
  {
    category: 'Fruit & Veg',
    words: [
      'apple',
      'banana',
      'orange',
      'berry',
      'berries',
      'grape',
      'melon',
      'lemon',
      'lime',
      'avocado',
      'onion',
      'garlic',
      'pepper',
      'potato',
      'carrot',
      'broccoli',
      'cauliflower',
      'cabbage',
      'lettuce',
      'spinach',
      'cucumber',
      'courgette',
      'mushroom',
      'tomato',
      'sweetcorn',
      'peas',
      'beansprout',
      'spring onion',
      'fresh herb',
      'coriander',
      'parsley',
    ],
  },
  {
    category: 'Dairy & Eggs',
    words: [
      'milk',
      'cheese',
      'cheddar',
      'mozzarella',
      'yoghurt',
      'yogurt',
      'butter',
      'cream',
      'egg',
      'custard',
      'margarine',
    ],
  },
  {
    category: 'Bakery',
    words: [
      'bread',
      'roll',
      'wrap',
      'pitta',
      'bagel',
      'croissant',
      'naan',
      'tortilla',
    ],
  },
  {
    category: 'Drinks',
    words: [
      'juice',
      'squash',
      'fizzy drink',
      'lemonade',
      'cola',
      'coffee',
      'tea bag',
      'hot chocolate',
    ],
  },
  {
    category: 'Snacks',
    words: [
      'crisps',
      'biscuit',
      'chocolate',
      'sweet',
      'popcorn',
      'snack bar',
      'cereal bar',
    ],
  },
  {
    category: 'Cupboard',
    words: [
      'pasta',
      'rice',
      'noodle',
      'flour',
      'sugar',
      'cereal',
      'oats',
      'stock',
      'spice',
      'seasoning',
      'oil',
      'vinegar',
      'ketchup',
      'mayonnaise',
      'mustard',
      'gravy',
      'lentil',
      'couscous',
      'quinoa',
    ],
  },
]

function containsWord(item: string, word: string) {
  const normalisedItem = item.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  const normalisedWord = word.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const escapedWord = normalisedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pluralEnding = /s$/.test(normalisedWord) ? '' : '(?:s|es)?'

  return new RegExp(`\\b${escapedWord}${pluralEnding}\\b`).test(normalisedItem)
}

export function categoriseIngredient(item: string): ShoppingCategory {
  for (const rule of categoryRules) {
    if (rule.words.some((word) => containsWord(item, word))) {
      return rule.category
    }
  }

  return 'Other'
}

export function parseIngredientLine(line: string): CategorisedIngredient | null {
  const cleanLine = line.trim().replace(/^[-*•]\s*/, '')

  if (!cleanLine) return null

  const separatorIndex = cleanLine.indexOf(':')

  if (separatorIndex > 0) {
    const possibleCategory = cleanLine.slice(0, separatorIndex).trim().toLowerCase()
    const legacyCategory = legacyCategoryNames[possibleCategory]

    if (legacyCategory) {
      const item = cleanLine.slice(separatorIndex + 1).trim()
      return item ? { category: legacyCategory, item } : null
    }
  }

  return {
    category: categoriseIngredient(cleanLine),
    item: cleanLine,
  }
}

export function parseIngredientList(
  ingredients: string | null
): CategorisedIngredient[] {
  if (!ingredients) return []

  return ingredients
    .split(/\r?\n/)
    .map(parseIngredientLine)
    .filter((ingredient): ingredient is CategorisedIngredient =>
      Boolean(ingredient)
    )
}

export function ingredientKey(
  ingredient: { category: string; item: string }
) {
  return `${ingredient.category.trim().toLowerCase()}:${ingredient.item
    .trim()
    .toLowerCase()}`
}

export function countMealsByIngredient(ingredientLists: Array<string | null>) {
  const counts = new Map<string, number>()

  ingredientLists.forEach((ingredients) => {
    const ingredientsInMeal = new Set(
      parseIngredientList(ingredients).map(ingredientKey)
    )

    ingredientsInMeal.forEach((key) => {
      counts.set(key, (counts.get(key) || 0) + 1)
    })
  })

  return counts
}

export function ingredientsForEditing(ingredients: string | null) {
  return parseIngredientList(ingredients)
    .map((ingredient) => ingredient.item)
    .join('\n')
}

export function normaliseIngredientList(ingredients: string) {
  return ingredientsForEditing(ingredients) || null
}
