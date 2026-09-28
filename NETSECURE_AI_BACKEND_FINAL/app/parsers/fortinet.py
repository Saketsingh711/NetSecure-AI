import re
from app.models import NormalizedConfig
from app.parsers.base import BaseParser, ParserResult


class FortinetParser(BaseParser):
    vendor = "fortinet"

    def parse(self, config: str) -> ParserResult:
        lines = config.splitlines()
        hostname = None
        m = re.search(r"set\s+hostname\s+\"?([^\"\n]+)\"?", config, re.I)
        if m:
            hostname = m.group(1).strip()

        telnet = bool(re.search(r"set\s+(?:admin-telnet|telnet)\s+enable", config, re.I))
        ssh = bool(re.search(r"set\s+(?:admin-ssh|ssh)\s+enable", config, re.I))
        http = bool(re.search(r"set\s+(?:admin-http|http)\s+enable", config, re.I))
        https = bool(re.search(r"set\s+(?:admin-https|https)\s+enable", config, re.I))
        aaa = bool(re.search(r"set\s+auth-method\s+(?:radius|ldap|tacacs|tacacs\+)", config, re.I))
        logging_enabled = bool(re.search(r"set\s+status\s+enable", config, re.I) and re.search(r"config\s+log", config, re.I))
        ntp = bool(re.search(r"config\s+system\s+ntp", config, re.I) and re.search(r"set\s+server-info\s+", config, re.I))
        snmp_v2 = bool(re.search(r"config\s+system\s+snmp\s+community", config, re.I))
        mgmt_acl = bool(re.search(r"set\s+trustedhost\d+\s+", config, re.I))

        evidence = {
            "management.telnet_enabled": [x.strip() for x in lines if re.search(r"admin-telnet|set\s+telnet\s+enable", x, re.I)],
            "management.ssh_enabled": [x.strip() for x in lines if re.search(r"admin-ssh|set\s+ssh\s+enable", x, re.I)],
            "management.http_enabled": [x.strip() for x in lines if re.search(r"admin-http|set\s+http\s+enable", x, re.I)],
            "management.https_enabled": [x.strip() for x in lines if re.search(r"admin-https|set\s+https\s+enable", x, re.I)],
            "authentication.aaa_enabled": [x.strip() for x in lines if re.search(r"auth-method", x, re.I)],
            "logging.enabled": [x.strip() for x in lines if re.search(r"set\s+status\s+enable", x, re.I)],
            "ntp.enabled": [x.strip() for x in lines if re.search(r"set\s+server-info", x, re.I)],
            "network_security.snmp_v2_community": [x.strip() for x in lines if re.search(r"config\s+system\s+snmp\s+community", x, re.I)],
            "management.management_acl": [x.strip() for x in lines if re.search(r"set\s+trustedhost\d+", x, re.I)],
        }

        unknown = []
        known_patterns = [
            r"^config\s+", r"^edit\s+", r"^next$", r"^end$", r"^set\s+hostname", r"^set\s+(?:admin-|ssh|http|https|telnet)",
            r"^set\s+auth-method", r"^set\s+status", r"^set\s+server-info", r"^set\s+trustedhost", r"^set\s+.*password", r"^set\s+.*idle-timeout",
        ]
        for raw in lines:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if not any(re.search(p, line, re.I) for p in known_patterns):
                unknown.append(line)

        normalized = NormalizedConfig(
            vendor="fortinet", hostname=hostname,
            management={"telnet_enabled": telnet, "ssh_enabled": ssh, "http_enabled": http, "https_enabled": https, "management_acl": mgmt_acl},
            authentication={"aaa_enabled": aaa}, logging={"enabled": logging_enabled}, ntp={"enabled": ntp},
            network_security={"snmp_v2_community": snmp_v2}, extracted_evidence=evidence,
        )
        return ParserResult(normalized, "FortinetParser", unknown[:20])
