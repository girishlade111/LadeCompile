import pathlib, re
replacements = [
    ('#aa2d00', '#0969da'),
    ('#f5e9d4', '#f6f8fa'),
    ('#fcab79', '#ffffff'),
    ('#a8d8c4', '#ffffff'),
    ('#0a2e0e', '#24292f'),
    ('#181d26', '#24292f'),
    ('#333840', '#32383f'),
    ('#41454d', '#656d76'),
    ('#dddddd', '#d0d7de'),
    ('#f8fafc', '#f6f8fa'),
    ('#e0e2e6', '#eaeef2'),
    ('#1b61c9', '#0969da'),
    ('#006400', '#1a7f37'),
]
files = list(pathlib.Path('apps/web/src').rglob('*.astro')) + list(pathlib.Path('apps/web/src').rglob('*.css'))
for f in files:
    text = f.read_text(encoding='utf-8')
    original = text
    if f.name == 'index.astro':
        parts = re.split(r'(<pre[\s\S]*?</pre>)', text)
        new_parts = []
        for part in parts:
            if part.startswith('<pre'):
                new_parts.append(part)
            else:
                for old, new in replacements:
                    part = part.replace(old, new)
                new_parts.append(part)
        text = ''.join(new_parts)
        text = text.replace('bg-[#0969da] p-8 sm:p-12 lg:p-14 text-white', 'bg-[#24292f] p-8 sm:p-12 lg:p-14 text-white')
        # fix syntax attribute green inside code block that got replaced outside? already protected
    else:
        for old, new in replacements:
            text = text.replace(old, new)
    if text != original:
        f.write_text(text, encoding='utf-8')
        print(f'updated {f}')
