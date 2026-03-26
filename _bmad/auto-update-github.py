#!/usr/bin/env python3
"""
BMad Auto-Update - Atualização automática via GitHub
Checa atualizações e baixa automaticamente
"""

import os
import sys
import subprocess
import json
import requests
from pathlib import Path
from datetime import datetime

# Configuração
BMAD_PATH = Path.home() / "bmad-master"
GITHUB_REPO = "bmad-code-org/BMAD-METHOD"
GITHUB_API = f"https://api.github.com/repos/{GITHUB_REPO}"
VERSION_FILE = BMAD_PATH / ".version"
REINDEX_SCRIPT = Path.home() / "claude-infra" / "index-bmad.py"

def get_current_version():
    """Pega versão atual instalada"""
    if VERSION_FILE.exists():
        return VERSION_FILE.read_text().strip()
    return "unknown"

def get_latest_github_version():
    """Checa última versão no GitHub"""
    try:
        # Tentar releases primeiro
        response = requests.get(f"{GITHUB_API}/releases/latest", timeout=10)
        if response.status_code == 200:
            data = response.json()
            return {
                "version": data["tag_name"],
                "date": data["published_at"],
                "url": data["zipball_url"],
                "notes": data.get("body", "")
            }

        # Fallback: último commit
        response = requests.get(f"{GITHUB_API}/commits/main", timeout=10)
        if response.status_code == 200:
            data = response.json()
            return {
                "version": data["sha"][:7],
                "date": data["commit"]["author"]["date"],
                "url": f"https://github.com/{GITHUB_REPO}/archive/main.zip",
                "notes": data["commit"]["message"]
            }

        return None
    except Exception as e:
        print(f"Erro ao checar GitHub: {e}")
        return None

def download_and_extract(url, target_path):
    """Baixa e extrai atualização"""
    import zipfile
    import tempfile

    print(f"Baixando de {url}...")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
        response = requests.get(url, stream=True, timeout=30)
        total = int(response.headers.get('content-length', 0))
        downloaded = 0

        for chunk in response.iter_content(chunk_size=8192):
            tmp.write(chunk)
            downloaded += len(chunk)
            if total:
                percent = (downloaded / total) * 100
                print(f"\rProgresso: {percent:.1f}%", end="")

        tmp_path = tmp.name

    print("\n\nExtraindo...")

    # Backup da versão atual
    backup_path = target_path.parent / f"bmad-master-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    if target_path.exists():
        print(f"Criando backup em {backup_path}...")
        import shutil
        shutil.copytree(target_path, backup_path)

    # Extrair
    with zipfile.ZipFile(tmp_path, 'r') as zip_ref:
        # GitHub zips vem com um diretório raiz, precisamos extrair o conteúdo
        members = zip_ref.namelist()
        root_dir = members[0].split('/')[0] if members else ""

        for member in members:
            # Remover o diretório raiz do caminho
            target_file = target_path / member.replace(f"{root_dir}/", "", 1)
            if member.endswith('/'):
                target_file.mkdir(parents=True, exist_ok=True)
            else:
                target_file.parent.mkdir(parents=True, exist_ok=True)
                with zip_ref.open(member) as source:
                    with open(target_file, 'wb') as target:
                        target.write(source.read())

    os.unlink(tmp_path)
    return True

def reindex_cache():
    """Re-indexa no Qdrant"""
    if not REINDEX_SCRIPT.exists():
        print(f"[!] Script de re-indexacao nao encontrado: {REINDEX_SCRIPT}")
        return False

    print("\n=== Re-indexando no cache ===")
    result = subprocess.run(
        ["python", str(REINDEX_SCRIPT)],
        capture_output=True,
        text=True
    )

    if result.returncode == 0:
        print("[OK] Cache re-indexado com sucesso!")
        return True
    else:
        print(f"[ERRO] Erro ao re-indexar: {result.stderr}")
        return False

def main():
    print("=" * 70)
    print("  BMad Auto-Update - Atualização via GitHub")
    print("=" * 70)
    print()

    # Versão atual
    current = get_current_version()
    print(f"Versão atual: {current}")

    # Checar GitHub
    print("Checando atualizações no GitHub...")
    latest = get_latest_github_version()

    if not latest:
        print("[ERRO] Nao foi possivel checar atualizacoes.")
        return 1

    print(f"Ultima versao: {latest['version']}")
    print(f"Data: {latest['date']}")

    # Comparar versões
    if current == latest['version']:
        print("\n[OK] Voce ja esta na ultima versao!")
        return 0

    print(f"\n[UPDATE] Nova versao disponivel: {latest['version']}")
    # Remover caracteres Unicode das notas para evitar erro no Windows
    notes = latest['notes'][:200].encode('ascii', 'ignore').decode('ascii')
    if notes:
        print(f"Notas da versao:\n{notes}...")
    print()

    # Confirmar atualização
    if "--auto" not in sys.argv:
        response = input("Deseja atualizar? (s/n): ")
        if response.lower() != 's':
            print("Atualização cancelada.")
            return 0

    # Baixar e instalar
    try:
        if download_and_extract(latest['url'], BMAD_PATH):
            # Salvar nova versão
            VERSION_FILE.write_text(latest['version'])
            print(f"\n[OK] BMad atualizado para {latest['version']}!")

            # Re-indexar
            if reindex_cache():
                print("\n" + "=" * 70)
                print("  ATUALIZACAO COMPLETA!")
                print("=" * 70)
                print()
                print("[OK] BMad atualizado")
                print("[OK] Cache re-indexado")
                print("[OK] Todos os projetos ja veem a nova versao")
                print()
                return 0
            else:
                print("\n[!] Atualizacao OK, mas re-indexacao falhou.")
                print("    Execute manualmente: python ~/claude-infra/index-bmad.py")
                return 1
        else:
            print("[ERRO] Falha ao baixar/extrair atualizacao")
            return 1

    except Exception as e:
        print(f"[ERRO] Erro durante atualizacao: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
