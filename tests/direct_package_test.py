import importlib.util
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
spec=importlib.util.spec_from_file_location('package_direct',Path(__file__).resolve().parents[1]/'scripts/package-direct.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class PackageTests(unittest.TestCase):
    def test_code_excludes_readings_and_audio_and_audio_includes_only_wanted(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);public=root/'public';public.mkdir()
            for name in ('index.html','app.js','styles.css','CNAME'):(public/name).write_text('fixture')
            (public/'data').mkdir();(public/'data/site_payload.json').write_text('{}')
            audio=public/'assets/audio';audio.mkdir(parents=True)
            a,b='a'*64,'b'*64
            for name in (a,b):(audio/(name+'.mp3')).write_bytes(b'fixture')
            (root/'.cache').mkdir();(root/'.cache/narration.json').write_text(json.dumps([{'hash':a}]))
            for kind,expected in [('site',{'index.html','app.js','styles.css'}),('audio',{a+'.mp3'})]:
                output=root/(kind+'.tar');m.package(kind,output,root)
                with tarfile.open(output) as archive:self.assertEqual(set(archive.getnames()),expected)
