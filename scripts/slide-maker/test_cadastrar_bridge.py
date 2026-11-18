import contextlib
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('bridge_setup', Path(__file__).with_name('cadastrar-bridge.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SetupTests(unittest.TestCase):
    def run_setup(self, existing=False, recover=False):
        calls = []
        value = 'fixture-sensitive-value'.ljust(64, 'x')

        def execute(command, input=None, capture_output=False):
            calls.append((command, input))
            output = b''
            if command[1:3] == ['secrets', 'list']:
                output = json.dumps([{'name': 'projects/p/secrets/' + module.NAME}]).encode()
            elif command[1:4] == ['secrets', 'versions', 'list']:
                output = json.dumps([{'name': 'projects/p/secrets/s/versions/1', 'state': 'ENABLED'}] if existing else []).encode()
            elif command[1:4] == ['secrets', 'versions', 'access']:
                output = value.encode()
            return type('Result', (), {'returncode': 0, 'stdout': output})()

        output = io.StringIO()
        with patch.object(module.sys, 'platform', 'win32'), patch.object(module.sys.stdin, 'isatty', return_value=True), \
             patch.object(module.sys, 'argv', ['script'] + (['--copiar-existente'] if recover else [])), \
             patch.object(module.shutil, 'which', return_value='gcloud.cmd'), \
             patch.object(module.secrets, 'token_urlsafe', return_value=value), \
             patch.object(module.subprocess, 'run', side_effect=execute), contextlib.redirect_stdout(output):
            if existing and not recover:
                with self.assertRaises(SystemExit):
                    module.main()
            else:
                module.main()
        self.assertNotIn(value, output.getvalue())
        self.assertFalse(any(value in ' '.join(command) for command, _ in calls))
        return calls, value

    def test_new_value_only_via_stdin_to_google_and_clipboard(self):
        calls, value = self.run_setup()
        self.assertEqual(sum(data == value.encode() for _, data in calls), 2)
        self.assertFalse(any(command[1:4] == ['secrets', 'versions', 'access'] for command, _ in calls))

    def test_existing_version_is_not_overwritten(self):
        calls, _ = self.run_setup(existing=True)
        self.assertFalse(any(command[1:4] in [['secrets', 'versions', 'add'], ['secrets', 'versions', 'access']] for command, _ in calls))

    def test_explicit_recopy_does_not_create_new_version(self):
        calls, value = self.run_setup(existing=True, recover=True)
        self.assertFalse(any(command[1:4] == ['secrets', 'versions', 'add'] for command, _ in calls))
        self.assertEqual(sum(data == value.encode() for _, data in calls), 1)


if __name__ == '__main__':
    unittest.main()
