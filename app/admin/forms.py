from flask_wtf import FlaskForm
from wtforms import SubmitField, FileField
# from wtforms.validators import DataRequired

class UploadForm(FlaskForm):
    file = FileField('Your CSV File')
    submit = SubmitField('Upload CSV')
    # how to style the submit button with wtf.quick_form:
    # https://stackoverflow.com/questions/45951346


