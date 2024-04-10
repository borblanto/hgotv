const axios = require('axios'); 
const cheerio = require('cheerio'); 
const fs = require('fs'); 
 
const targetURL = 'https://hackmd.io/@67QuUe0VRy-nPCNoJwtsgQ/plan-d'; 

const RESOLUTIONS = ['HD', '1080p', '720p'];  
const getChannels = ($) => { 
	// Get all list items from the unodered list with a class name of 'products' 
	const markdown = $('#doc').html(); 
    const rows = markdown.split('\n');
	const errors = [];
    const channels = rows
        .filter(rowsWithAcestreamLink)
        .map((row) => {
			try {
				const literals = extractLiterals(row);
				const channel = extractChannelFromRowLiterals(literals);
				const acestreamLinks = extractAcestreamLinks(row);
            	const resolutions = extractResolutionsFromRowLiterals(literals);
            	return { channel, resolutions, links: acestreamLinks };
			} catch(e) {
				return { error: true, trace: { row, ex: e }};
			}
        })
		.map(filterAndLogErrors);

	return { channels, errors };

	function extractAcestreamLinks(row) {
		const matchs = [...row.matchAll(/acestream:\/\/[^\)]*/g)];
		return matchs.map((match) => match[0]);

	}

	function rowsWithAcestreamLink(row) {
		return row.includes('(acestream://');
	}

	function extractLiterals(row) {
		const matchs = [...row.matchAll(/(\*\*)([^\*]*)(\*\*)/g)];
		return matchs.map((match) => match[2]);
	}

	function extractChannelFromRowLiterals(literals) {
		const [channel] = literals;
		return RESOLUTIONS.reduce((channel, resolution) => channel.replace(resolution, ''), channel)
	}

	function extractResolutionsFromRowLiterals(literals) {
		const [channel, ...extraResolutions] = literals;
		const resolutionChannel = RESOLUTIONS.find((res) => channel.includes(res));
		if (!resolutionChannel) {
			return [];
		}
		return [resolutionChannel, ...extraResolutions];
	} 

	function filterAndLogErrors(channelOrError) {
		if (channelOrError.error) {
			errors.push(channelOrError.trace);
		}
		return channelOrError;
	}
	
} 
 
// axios function to fetch HTML Markup from target URL 
axios.get(targetURL).then((response) => { 
	const body = response.data; 
	const $ = cheerio.load(body); // Load HTML data and initialize cheerio 
	const { channels, errors } = getChannels($) 
	console.log(channels);
	console.log(errors);

	// Create a 'channels.json' file in the root directory with the scraped pokemonData 
	fs.writeFile("channels.json", JSON.stringify(channels, null, 2), (err) => { 
		if (err) { 
			console.error(err); 
			return; 
		} 
		console.log("Data channels written to file successfully!"); 
	}); 

	fs.writeFile("errors.json", JSON.stringify(errors, null, 2), (err) => { 
		if (err) { 
			console.error(err); 
			return; 
		} 
		console.log("Data error written to file successfully!"); 
	}); 
});
