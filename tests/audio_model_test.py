import importlib.util
import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import build_audio

class ModelTests(unittest.TestCase):
    def test_empty_cache_download_completes_before_model_is_visible(self):
        with tempfile.TemporaryDirectory() as temp,patch.object(build_audio,'CACHE',Path(temp)),patch.object(build_audio.urllib.request,'urlopen',return_value=io.BytesIO(b'model')):
            path=build_audio.model_file('fixture.onnx','https://fixture.invalid')
            self.assertEqual(path.read_bytes(),b'model')
            self.assertFalse(path.with_suffix('.onnx.part').exists())
