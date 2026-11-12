"""Extract portrait assets from the read-only Office renders of the supplied deck.

Run fortaleza-monthly-art.ps1 for slides57/58 first. Coordinates refer to the
1280x720 original renders, never to a live report or a downloaded replacement.
"""
from pathlib import Path
from PIL import Image

root = Path('.local-inputs/relatorios-lucas/fortaleza')
target = Path('src/features/relatorios-institucionais/fortaleza/assets/monthly/people')
target.mkdir(parents=True, exist_ok=True)
rectangles = {
    57: [(81, 34, 257, 211), (334, 28, 510, 204), (592, 25, 769, 204),
         (75, 364, 261, 550), (321, 368, 508, 550), (589, 368, 779, 555)],
    58: [(73, 180, 262, 379), (332, 173, 521, 382), (599, 167, 791, 384)],
}
for page, boxes in rectangles.items():
    with Image.open(root / f'monthly-original-{page}.png') as source:
        assert source.size == (1280, 720), 'Unexpected source dimensions'
        for index, box in enumerate(boxes):
            source.crop(box).save(target / f'{page}-{index}.png')
print('Nine reference portraits extracted; no source document modified.')
