import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';
import sourcemaps from 'rollup-plugin-sourcemaps';
import babel from '@rollup/plugin-babel';

export default {
  input: 'src/frontend/app.js',
  output:{
    file: 'bundle.js',
    sourcemap: true,
    format: 'iife'
  },
  plugins: [
    babel({
        babelHelpers: 'bundled',
        presets: ['@babel/preset-env'],
        plugins: [['@babel/plugin-transform-react-jsx', {
          pragma: 'h',
          pragmaFrag: 'Fragment',
        }]],
        exclude: 'node_modules/**',
        extensions: ['.js', '.jsx']
      }),
    nodeResolve(), 
    commonjs(),
    globals(),
    builtins(),
    sourcemaps(),
  ]
};