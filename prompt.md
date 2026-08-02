## Specifications fonctionnelles

- un color picker qui permette de recupperer les couleurs de ce qu'il a affiché a l'ecran.
- un color chooser sous plusieurs formes, roue de colo , carré avec curseur, ou curseur avec : sRGB P3 RGB TSV TSL CMJN LAB LCH OKLCH
- je veux qu'il y a ait des option de copie en code hexadecimal hsl rvb css et pour les langages de programmation.
- je veux aussi qu'il y ait de quoi choisir des palette des couleur a partir de :
  - une couleur :
    - Complementary
    - Split Complement
    - Analogous
    - Monochromatic
    - Triadic
    - Tetradic
    - Unlocked
  - une image :
    - option de choisir combien de couleur on peut en extraire
- je veux pouvoir sauvegarder mes palettes de couleurs dans une libraire de favoris et les ranger par signet si j'en ai envie
  - On doit aussi pouvoir exporter en json sa librairie
- je veux un générateur de couleur aléatoire
- On peut export en json une palette de couleur

## Specification design

- les différentes pages de fonctionnalité seront rangé sur une side nav bar
- tu utiliseras la lib d'icones : hugeicons-react (bulk rounded) si c'est gratuit et accessible
- l'application sera en anglais
- un theme neutre et cosy
- light mode / dark mode

## Specification Technique

- Tu feras un application react-typescript embarqué en electron
- Tu stockeras en local les données de l'utilisateur sous forme de json lisible
