import re
from app.models import NormalizedConfig
from app.parsers.base import BaseParser, ParserResult


class CiscoParser(BaseParser):
    vendor = "cisco"

    def parse(self, config: str) -> ParserResult:
        lines = config.splitlines()
        hostname = None
        m = re.search(r"^\s*hostname\s+(\S+)", config, re.M | re.I)
        if m:
            hostname = m.group(1)

        telnet = bool(re.search(r"transport\s+input\s+[^\n]*\btelnet\b", config, re.I))
        ssh = bool(re.search(r"transport\s+input\s+[^\n]*\bssh\b", config, re.I) or re.search(r"ip\s+ssh\s+version\s+[12]", config, re.I))
        http = bool(re.search(r"^\s*ip\s+http\s+server\b", config, re.M | re.I))
        https = bool(re.search(r"^\s*ip\s+http\s+secure-server\b", config, re.M | re.I))
        aaa = bool(re.search(r"^\s*aaa\s+new-model\b", config, re.M | re.I))
        logging_enabled = bool(re.search(r"^\s*logging\s+(?:on|host|trap|buffered)\b", config, re.M | re.I))
        ntp = bool(re.search(r"^\s*ntp\s+server\s+\S+", config, re.M | re.I))
        snmp_v2 = bool(re.search(r"^\s*snmp-server\s+community\s+", config, re.M | re.I))
        mgmt_acl = bool(re.search(r"access-class\s+\S+\s+in", config, re.I))

        evidence = {
            "management.telnet_enabled": [x.strip() for x in lines if re.search(r"transport\s+input\s+[^\n]*telnet", x, re.I)],
            "management.ssh_enabled": [x.strip() for x in lines if re.search(r"transport\s+input\s+[^\n]*ssh|ip\s+ssh\s+version", x, re.I)],
            "management.http_enabled": [x.strip() for x in lines if re.search(r"ip\s+http\s+server", x, re.I)],
            "management.https_enabled": [x.strip() for x in lines if re.search(r"ip\s+http\s+secure-server", x, re.I)],
            "authentication.aaa_enabled": [x.strip() for x in lines if re.search(r"aaa\s+new-model", x, re.I)],
            "logging.enabled": [x.strip() for x in lines if re.search(r"^logging\s+(?:on|host|trap|buffered)", x, re.I)],
            "ntp.enabled": [x.strip() for x in lines if re.search(r"^ntp\s+server", x, re.I)],
            "network_security.snmp_v2_community": [x.strip() for x in lines if re.search(r"snmp-server\s+community", x, re.I)],
            "management.management_acl": [x.strip() for x in lines if re.search(r"access-class\s+\S+\s+in", x, re.I)],
        }

        known = ("hostname ", "version ", "interface ", " description", " ip ", " shutdown", "router ", "line ", " transport ", " login", " privilege", " access-class", "aaa ", "ip ssh", "ip http", "logging", "ntp ", "snmp-server", "!")
        unknown = []
        for raw in lines:
            line = raw.strip()
            if not line or line == "!":
                continue
            if not line.startswith(known):
                unknown.append(line)

        normalized = NormalizedConfig(
            vendor="cisco", hostname=hostname,
            management={"telnet_enabled": telnet, "ssh_enabled": ssh, "http_enabled": http, "https_enabled": https, "management_acl": mgmt_acl},
            authentication={"aaa_enabled": aaa}, logging={"enabled": logging_enabled}, ntp={"enabled": ntp},
            network_security={"snmp_v2_community": snmp_v2}, extracted_evidence=evidence,
        )
        return ParserResult(normalized, "CiscoParser", unknown[:20])
