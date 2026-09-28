import re


def detect_vendor(config: str, filename: str = "") -> str:
    text = config.lower()
    name = filename.lower()
    if any(x in name for x in ("forti", "fortigate", "fortios")):
        return "fortinet"
    if any(x in name for x in ("juniper", "junos")) or name.endswith(".set"):
        return "juniper"
    if any(x in name for x in ("cisco", "ios", "running-config")):
        return "cisco"
    if "config system global" in text or re.search(r"^\s*config\s+firewall\s+", text, re.M):
        return "fortinet"
    if re.search(r"^\s*set\s+(system|security|interfaces|protocols)\s+", text, re.M):
        return "juniper"
    if re.search(r"^\s*hostname\s+\S+", text, re.M) or re.search(r"^\s*(interface|line vty|ip route)\s+", text, re.M):
        return "cisco"
    return "unknown"
