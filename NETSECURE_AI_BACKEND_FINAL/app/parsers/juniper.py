import re
from app.models import NormalizedConfig
from app.parsers.base import BaseParser, ParserResult


class JuniperParser(BaseParser):
    vendor = "juniper"

    def parse(self, config: str) -> ParserResult:
        lines = config.splitlines()
        hostname = None
        m = re.search(r"^set\s+system\s+host-name\s+(\S+)", config, re.M | re.I)
        if m:
            hostname = m.group(1)

        patterns = {
            "telnet_enabled": r"^set\s+system\s+services\s+telnet(?:\s|$)",
            "ssh_enabled": r"^set\s+system\s+services\s+ssh(?:\s|$)",
            "http_enabled": r"^set\s+system\s+services\s+web-management\s+http(?:\s|$)",
            "https_enabled": r"^set\s+system\s+services\s+web-management\s+https(?:\s|$)",
        }
        telnet = bool(re.search(patterns["telnet_enabled"], config, re.M | re.I))
        ssh = bool(re.search(patterns["ssh_enabled"], config, re.M | re.I))
        http = bool(re.search(patterns["http_enabled"], config, re.M | re.I))
        https = bool(re.search(patterns["https_enabled"], config, re.M | re.I))
        aaa = bool(re.search(r"^set\s+system\s+authentication-order\s+(?:radius|tacplus|tacacs|ldap)(?:\s|$)", config, re.M | re.I))
        logging_enabled = bool(re.search(r"^set\s+system\s+syslog\b", config, re.M | re.I))
        ntp = bool(re.search(r"^set\s+system\s+ntp\s+server\s+\S+", config, re.M | re.I))
        snmp_v2 = bool(re.search(r"^set\s+snmp\s+community\s+\S+", config, re.M | re.I))
        mgmt_acl = bool(re.search(r"^set\s+firewall\s+family\s+inet\s+filter\s+", config, re.M | re.I))

        evidence = {k: [] for k in [
            "management.telnet_enabled", "management.ssh_enabled", "management.http_enabled", "management.https_enabled",
            "authentication.aaa_enabled", "logging.enabled", "ntp.enabled", "network_security.snmp_v2_community", "management.management_acl"
        ]}
        for raw in lines:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if re.match(patterns["telnet_enabled"], line, re.I): evidence["management.telnet_enabled"].append(line)
            elif re.match(patterns["ssh_enabled"], line, re.I): evidence["management.ssh_enabled"].append(line)
            elif re.match(patterns["http_enabled"], line, re.I): evidence["management.http_enabled"].append(line)
            elif re.match(patterns["https_enabled"], line, re.I): evidence["management.https_enabled"].append(line)
            elif re.match(r"^set\s+system\s+authentication-order", line, re.I): evidence["authentication.aaa_enabled"].append(line)
            elif re.match(r"^set\s+system\s+syslog\b", line, re.I): evidence["logging.enabled"].append(line)
            elif re.match(r"^set\s+system\s+ntp\s+server", line, re.I): evidence["ntp.enabled"].append(line)
            elif re.match(r"^set\s+snmp\s+community", line, re.I): evidence["network_security.snmp_v2_community"].append(line)
            elif re.match(r"^set\s+firewall\s+family\s+inet\s+filter\s+", line, re.I): evidence["management.management_acl"].append(line)

        known = [
            r"^set\s+system\s+host-name\s+\S+",
            r"^set\s+system\s+services\s+ssh(?:\s|$)",
            r"^set\s+system\s+services\s+telnet(?:\s|$)",
            r"^set\s+system\s+services\s+web-management\s+http(?:\s|$)",
            r"^set\s+system\s+services\s+web-management\s+https(?:\s|$)",
            r"^set\s+system\s+ntp\s+server\s+\S+",
            r"^set\s+system\s+authentication-order\s+(?:radius|tacplus|tacacs|ldap)(?:\s|$)",
            r"^set\s+system\s+syslog\b",
            r"^set\s+snmp\s+community\s+\S+",
            r"^set\s+firewall\s+family\s+inet\s+filter\s+",
        ]
        unknown = []
        for raw in lines:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if not any(re.match(p, line, re.I) for p in known):
                unknown.append(line)

        normalized = NormalizedConfig(
            vendor="juniper", hostname=hostname,
            management={"telnet_enabled": telnet, "ssh_enabled": ssh, "http_enabled": http, "https_enabled": https, "management_acl": mgmt_acl},
            authentication={"aaa_enabled": aaa}, logging={"enabled": logging_enabled}, ntp={"enabled": ntp},
            network_security={"snmp_v2_community": snmp_v2}, extracted_evidence=evidence,
        )
        return ParserResult(normalized, "JuniperParser", unknown[:20])
