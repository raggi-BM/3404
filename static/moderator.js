document.addEventListener('DOMContentLoaded', function () {
    const socket = io.connect('http://{{ ip_address }}:5000');
    const searchInput = document.getElementById('search');
    const filterApproved = document.getElementById('filter-approved');
    const filterUnapproved = document.getElementById('filter-unapproved');
    const tableBody = document.getElementById('table-body');

    socket.on('all_words', function (strings) {
        tableBody.innerHTML = '';

        strings.forEach(row => {
            if ((row.approved && !filterApproved.checked) || (!row.approved && !filterUnapproved.checked)) {
                return;
            }

            if (searchInput.value && !row.string.toLowerCase().includes(searchInput.value.toLowerCase())) {
                return;
            }

            const tr = document.createElement('tr');
            tr.className = row.approved ? '' : 'unapproved';
            tr.innerHTML = `
                <td>${row.id}</td>
                <td>${row.string}</td>
                <td class="toggle-container">
                    <input type="checkbox" ${row.approved ? 'checked' : ''} onchange="toggleApproval(${row.id}, this.checked)">
                </td>
                <td>
                    <button onclick="deleteString(${row.id})">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    });

    function fetchData() {
// Initial fetch to populate the table
fetch(`http://{{ ip_address }}:5000/get_all`)
.then(response => response.json())
.then(data => {
    const strings = data.data;  // Access the data array from the JSON response

    tableBody.innerHTML = '';

    strings.forEach(row => {
        if ((row.approved && !filterApproved.checked) || (!row.approved && !filterUnapproved.checked)) {
            return;
        }

        if (searchInput.value && !row.string.toLowerCase().includes(searchInput.value.toLowerCase())) {
            return;
        }

        const tr = document.createElement('tr');
        tr.className = row.approved ? '' : 'unapproved';
        tr.innerHTML = `
            <td>${row.id}</td>
            <td>${row.string}</td>
            <td class="toggle-container">
                <input type="checkbox" ${row.approved ? 'checked' : ''} onchange="toggleApproval(${row.id}, this.checked)">
            </td>
            <td>
                <button onclick="deleteString(${row.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
})
.catch(error => console.error('Error fetching data:', error));
}


    window.toggleApproval = function(id, approved) {
        console.log(`Toggling approval for ID ${id} to ${approved}`);
        fetch(`http://{{ ip_address }}:5000/approve_string/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ approved })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to toggle approval');
            }
            return response.json();
        })
        .then(() => fetchData())
        .catch(error => console.error('Error toggling approval:', error));
    };

    window.deleteString = function(id) {
        console.log(`Deleting string with ID ${id}`);
        fetch(`http://{{ ip_address }}:5000/delete_string/${id}`, { method: 'DELETE' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete string');
                }
                return response.json();
            })
            .then(() => fetchData())
            .catch(error => console.error('Error deleting string:', error));
    };

    searchInput.addEventListener('input', fetchData);
    filterApproved.addEventListener('change', fetchData);
    filterUnapproved.addEventListener('change', fetchData);

    fetchData();
});