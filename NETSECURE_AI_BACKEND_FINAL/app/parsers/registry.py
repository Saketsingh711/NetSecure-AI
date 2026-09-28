from app.parsers.cisco import CiscoParser
from app.parsers.fortinet import FortinetParser
from app.parsers.juniper import JuniperParser

PARSERS = {
    "cisco": CiscoParser(),
    "fortinet": FortinetParser(),
    "juniper": JuniperParser(),
}
