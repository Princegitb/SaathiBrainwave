import sys; sys.path.insert(0, '.')
from services.safety_shield import redact_text, _fast_keyword_check

# Verify redact works
print('Email redact:  ', repr(redact_text('hi there test@example.com please')))
print('Phone redact:  ', repr(redact_text('call me at 5551234567 tonight')))
print('URL redact:    ', repr(redact_text('check https://example.com/path here.')))
print('Handle redact: ', repr(redact_text('msg me @instagram_user k?')))
print('No redact:     ', repr(redact_text('just a normal message')))

# Verify the broken email regex is now fixed
result = _fast_keyword_check('contact me at user.name+tag@example.co')
print('Email detection:', result.category, '/', result.is_safe)

# Crisis language detection
result = _fast_keyword_check('I want to kill myself')
print('Crisis detection:', result.category, '/', result.is_safe, '/', result.action)

# Threat detection
result = _fast_keyword_check("i will find you")
print('Threat detection:', result.category, '/', result.is_safe)

# Plain safe
result = _fast_keyword_check('I have an interview tomorrow')
print('Safe detection: ', result.category, '/', result.is_safe)