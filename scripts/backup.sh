#!/bin/bash
# Veritabanı Yedekleme Betiği
# FAZ 25: CI/CD Pipeline & Yedekleme

# Ayarlar
DB_CONTAINER="bilet_db"
DB_USER="bilet_user"
DB_NAME="bilet_db"
BACKUP_DIR="/var/backups/biletapp"
DATE=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

# Klasör yoksa oluştur
mkdir -p "$BACKUP_DIR"

# Docker içinden pg_dump çalıştırarak yedek al
echo "Yedekleme başlatılıyor: $DATE"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -F c > "$BACKUP_DIR/db_backup_$DATE.dump"

if [ $? -eq 0 ]; then
  echo "Yedekleme başarılı: $BACKUP_DIR/db_backup_$DATE.dump"
else
  echo "Yedekleme BAŞARISIZ!"
  exit 1
fi

# Eski yedekleri sil (30 günden eski olanları)
echo "Eski yedekler temizleniyor..."
find "$BACKUP_DIR" -type f -name "db_backup_*.dump" -mtime +$RETENTION_DAYS -exec rm {} \;

echo "İşlem tamamlandı."
