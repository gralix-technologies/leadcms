
import os

file_path = 'static/leads/js/dashboard.js'

new_function = r"""function renderQuickViewCards(data) {
    const container = document.getElementById('quickViewCards');

    const statusCards = [
        {
            id: 'all',
            title: 'All Leads',
            count: data.total_leads || 0,
            icon: 'bi-grid-3x3-gap',
            colorClass: 'primary',
            statusFilter: 'all'
        },
        {
            id: 'hot',
            title: 'Hot Leads',
            count: data.status_counts?.hot || 0,
            icon: 'bi-fire',
            colorClass: 'danger',
            statusFilter: 'hot'
        },
        {
            id: 'qualified',
            title: 'Qualified',
            count: data.status_counts?.qualified || 0,
            icon: 'bi-check-circle',
            colorClass: 'success',
            statusFilter: 'qualified'
        },
        {
            id: 'contacted',
            title: 'Contacted',
            count: data.status_counts?.contacted || 0,
            icon: 'bi-telephone',
            colorClass: 'info',
            statusFilter: 'contacted'
        },
        {
            id: 'proposal',
            title: 'Proposal Sent',
            count: data.status_counts?.proposal || 0,
            icon: 'bi-file-earmark-text',
            colorClass: 'primary',
            statusFilter: 'proposal'
        },
        {
            id: 'negotiation',
            title: 'Negotiations',
            count: data.status_counts?.negotiation || 0,
            icon: 'bi-chat-dots',
            colorClass: 'warning',
            statusFilter: 'negotiation'
        },
        {
            id: 'won',
            title: 'Won',
            count: data.status_counts?.won || 0,
            icon: 'bi-trophy',
            colorClass: 'success',
            statusFilter: 'won'
        },
        {
            id: 'lost',
            title: 'Lost',
            count: data.status_counts?.lost || 0,
            icon: 'bi-x-circle',
            colorClass: 'secondary',
            statusFilter: 'lost'
        },
        {
            id: 'unassigned',
            title: 'Unassigned',
            count: data.unassigned_leads || 0,
            icon: 'bi-person-x',
            colorClass: 'warning',
            statusFilter: 'unassigned'
        },
        {
            id: 'lost_metrics',
            title: 'Lost Deals',
            count: data.lost_count || 0,
            value: data.lost_value || 0,
            icon: 'bi-x-circle',
            colorClass: 'secondary',
            statusFilter: 'lost'
        },
        {
            id: 'weighted',
            title: 'Weighted Forecast',
            isMoney: true,
            count: data.weighted_pipeline || 0,
            icon: 'bi-graph-up-arrow',
            colorClass: 'info',
            noFilter: true
        }
    ];

    let html = `
        <div id="quickViewCarousel" class="carousel slide" data-bs-ride="false" data-bs-interval="false">
            <div class="carousel-inner">
    `;

    // Group cards into slides (4 cards per slide)
    for (let i = 0; i < statusCards.length; i += 4) {
        const isActive = i === 0 ? 'active' : '';
        html += `
            <div class="carousel-item ${isActive}">
                <div class="row g-3">
        `;

        // Add up to 4 cards per slide
        for (let j = i; j < Math.min(i + 4, statusCards.length); j++) {
            const card = statusCards[j];
            
            let valueDisplay = card.count;
            let subtitle = '';
            
            if (card.isMoney) {
                valueDisplay = formatCurrency(card.count);
                subtitle = 'Expected Value';
            } else if (card.value) {
                subtitle = formatCurrency(card.value);
            }

            let clickAction = card.noFilter ? '' : `onclick="filterByStatus('${card.statusFilter}')"`;
            let cursorClass = card.noFilter ? '' : 'cursor-pointer';

            html += `
                <div class="col-lg-3 col-md-6 col-sm-12">
                    <div class="card quick-view-card card-futuristic h-100 shadow-sm border-0" 
                         ${clickAction} 
                         style="${card.noFilter ? '' : 'cursor: pointer;'}"
                         id="card-${card.id}">
                        <div class="card-body text-center p-4">
                            <i class="bi ${card.icon} fs-2 text-${card.colorClass} mb-3 d-block text-glow-${card.colorClass}"></i>
                            <h3 class="mb-2 text-${card.colorClass} text-glow-${card.colorClass}">${valueDisplay}</h3>
                            <p class="card-text text-muted mb-0 small text-uppercase fw-bold text-opacity-75">${card.title}</p>
                            ${subtitle ? `<small class="text-muted d-block mt-2 opacity-75">${subtitle}</small>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;
    }

    html += `
            </div>
            
            <button class="carousel-control-prev carousel-control-custom" type="button" data-bs-target="#quickViewCarousel" data-bs-slide="prev">
                <i class="bi bi-chevron-left fs-4 text-white"></i>
                <span class="visually-hidden">Previous</span>
            </button>
            <button class="carousel-control-next carousel-control-custom" type="button" data-bs-target="#quickViewCarousel" data-bs-slide="next">
                <i class="bi bi-chevron-right fs-4 text-white"></i>
                <span class="visually-hidden">Next</span>
            </button>
        </div>
    `;

    container.innerHTML = html;

    // Initialize carousel manually
    const carouselElement = document.getElementById('quickViewCarousel');
    new bootstrap.Carousel(carouselElement, {
        interval: false,
        wrap: true,
        touch: true
    });
}"""

# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find start and end of the function
start_marker = "function renderQuickViewCards(data) {"
end_marker = "function renderAnalytics() {"

start_pos = content.find(start_marker)
if start_pos == -1:
    print("Start marker not found")
    exit(1)

next_func_pos = content.find(end_marker, start_pos)
if next_func_pos == -1:
    print("End marker (next function) not found")
    exit(1)

# Find the closing brace before the next function
# We assume standard formatting: spaces/newlines before next function
# Search backwards from next_func_pos
scan_pos = next_func_pos - 1
while scan_pos > start_pos and content[scan_pos].strip() == '':
    scan_pos -= 1

# Now scan_pos should be at the closing brace of renderQuickViewCards, or newline after it
# Actually, let's just replace from start_pos to next_func_pos (excluding next_func_pos)
# And trim whitespace from our new_function and add necessary spacing

# The chunk to replace is roughly from start_pos to next_func_pos
# We need to make sure we don't eat the next function header

pre_content = content[:start_pos]
post_content = content[next_func_pos:]

new_content = pre_content + new_function + "\n\n" + post_content

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully replaced renderQuickViewCards")
