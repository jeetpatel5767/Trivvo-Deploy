import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer } from 'lucide-react';
import { getHunt } from '../../lib/api';
import type { Hunt } from '../../lib/types';
import { AppBar, Block, Button, IconStrip, Panel, Skeleton } from '../../ui';
import { Icon } from '../../components/Icon';

/** QR code — the code is the screen. */
export default function QRCodePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getHunt(id)
      .then((res) => setHunt(res.data.hunt))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const qrData = `${id}:${hunt?.qr_secret ?? `demo_secret_${id}`}`;

  const download = () => {
    const svg = document.querySelector('.qr-target svg') as SVGSVGElement;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 50, 50, 300, 300);
      }
      const link = document.createElement('a');
      link.download = `trivvo-hunt-${id}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="screen">
      <div className="hero hero--pink hero--tall" style={{ paddingTop: 0 }}>
        <AppBar tone="pink" onBack={() => navigate('/vendor/dashboard')} />
        <span className="overline">Display this in store</span>
        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', marginTop: 8 }}>
          Your code.
        </h1>
      </div>

      <Panel style={{ marginTop: -16, position: 'relative' }}>
        <Block>
          {loading ? (
            <Skeleton h={250} r={14} />
          ) : (
            <div className="qr-target" style={{ display: 'flex', justifyContent: 'center', padding: 6 }}>
              <QRCodeSVG value={qrData} size={248} bgColor="#FFFFFF" fgColor="#10231C" level="M" />
            </div>
          )}
        </Block>

        {hunt?.title && (
          <Block tight>
            <div className="title-s">{hunt.title}</div>
            <p className="body-sm t-muted" style={{ marginTop: 6 }}>
              Hunters scan this to check in and collect their arrival reward.
            </p>
          </Block>
        )}

        <Block tight style={{ padding: 0 }}>
          <IconStrip
            items={[
              { icon: <Download strokeWidth={2.2} />, label: 'Download', onClick: download },
              { icon: <Printer strokeWidth={2.2} />, label: 'Print', onClick: () => window.print() },
              { icon: <Icon name="coins" set="objects" size={22} />, label: 'Fund', onClick: () => navigate(`/vendor/fund/${id}`) },
            ]}
          />
        </Block>
      </Panel>

      <div className="pad" style={{ marginTop: 32 }}>
        <Button variant="ink" size="lg" block onClick={() => navigate(`/vendor/fund/${id}`)}>
          Fund this hunt
        </Button>
      </div>
    </div>
  );
}
