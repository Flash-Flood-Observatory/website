"""Package code or only current narration; readings are never in a build archive."""
import argparse
import json
from pathlib import Path
import tarfile

ROOT=Path(__file__).resolve().parents[1]


def package(kind,output,root=ROOT):
    public=root/'public'
    if kind=='site':
        files=[p for p in public.rglob('*') if p.is_file() and not p.is_symlink()
               and p.relative_to(public).parts[0]!='data'
               and p.relative_to(public).parts[:2]!=('assets','audio')
               and p.name not in {'CNAME','.nojekyll'}]
        names={p:p.relative_to(public).as_posix() for p in files}
        if not {'index.html','app.js','styles.css'} <= set(names.values()):raise ValueError('Incomplete site')
    elif kind=='audio':
        requests=json.loads((root/'.cache/narration.json').read_text())
        wanted={r['hash']+'.mp3' for r in requests}
        import re
        if not wanted or any(not re.fullmatch('[0-9a-f]{64}\\.mp3',n) for n in wanted):raise ValueError('Invalid narration manifest')
        names={public/'assets/audio'/name:name for name in wanted}
    else:raise ValueError('Unknown component')
    if sum(p.stat().st_size for p in names)>32*1024**2:raise ValueError('Component exceeds budget')
    if any(not p.is_file() or p.is_symlink() for p in names):raise ValueError('Ordinary files required')
    with tarfile.open(output,'w',format=tarfile.USTAR_FORMAT) as archive:
        for path,name in sorted(names.items()):archive.add(path,arcname=name,recursive=False)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('kind',choices=['site','audio']);parser.add_argument('output',type=Path)
    args=parser.parse_args();package(args.kind,args.output)
