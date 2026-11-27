'use client';

import EventsManager from './events-manager';

// Admin → Events: add events to the website's Events section and manage them.
export default function EventsPage() {
    return (
        <>
            <header className="cp-topbar">
                <div className="cp-topbar__brand">
                    <img
                        className="cp-topbar__logo"
                        src="/assets/images/ngi/project-images/torii-dark-text.svg"
                        alt="ToriiMinds"
                        width="500"
                        height="240"
                    />
                    <div className="cp-topbar__titles">
                        <h1 className="cp-topbar__title">Events</h1>
                        <p className="cp-topbar__sub">
                            Add events to the website · shown in the Events carousel, newest first by date
                        </p>
                    </div>
                </div>
            </header>

            <EventsManager />
        </>
    );
}
