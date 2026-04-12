#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt
mkdir -p uploads/missing_persons
mkdir -p uploads/sightings
