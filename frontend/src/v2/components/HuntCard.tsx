import { Card, Money, StatusBadge, Meta } from './UI';
import { MapPin, Clock, User } from './Icons';
import { timeRemaining, timeUntil, totalReward } from '../lib/format';

export interface HuntLike {
    hunt_id: string;
    title: string;
    business_name?: string;
    arrival_reward: number | string;
    main_reward: number | string;
    status?: string;
    location_name?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    active_participants?: number;
}

export function HuntCard({ hunt, onClick }: { hunt: HuntLike; onClick: () => void }) {
    const status = (hunt.status || '').toLowerCase();
    const clock = status === 'upcoming'
        ? timeUntil(hunt.start_time)
        : timeRemaining(hunt.end_time);
    const participants = Number(hunt.active_participants) || 0;

    return (
        <Card onClick={onClick}>
            {/* Status + time */}
            <div className="v2-row v2-row--between" style={{ marginBottom: 14 }}>
                <StatusBadge status={hunt.status} />
                {clock && (
                    <Meta icon={<Clock />}>{clock}</Meta>
                )}
            </div>

            {/* Title + vendor */}
            <h3
                style={{
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: '-0.028em',
                    lineHeight: 1.22,
                    margin: '0 0 5px',
                    color: 'var(--v2-text-hi)',
                }}
            >
                {hunt.title}
            </h3>
            {hunt.business_name && (
                <p
                    style={{
                        fontSize: 13.5,
                        fontWeight: 550,
                        color: 'var(--v2-text-mid)',
                        margin: 0,
                    }}
                >
                    {hunt.business_name}
                </p>
            )}

            {/* Reward — the hero of the card */}
            <div
                className="v2-row v2-row--between"
                style={{
                    marginTop: 18,
                    paddingTop: 16,
                    borderTop: '1px solid var(--v2-hairline)',
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 10.5,
                            fontWeight: 650,
                            letterSpacing: '0.09em',
                            textTransform: 'uppercase',
                            color: 'var(--v2-text-lo)',
                            marginBottom: 5,
                        }}
                    >
                        Earn up to
                    </div>
                    <Money amount={totalReward(hunt)} size="lg" />
                </div>

                <div className="v2-stack v2-stack--8" style={{ alignItems: 'flex-end' }}>
                    {hunt.location_name && (
                        <Meta icon={<MapPin />} truncate>{hunt.location_name}</Meta>
                    )}
                    {participants > 0 && (
                        <Meta icon={<User />}>
                            {participants} {participants === 1 ? 'hunter' : 'hunters'}
                        </Meta>
                    )}
                </div>
            </div>
        </Card>
    );
}
