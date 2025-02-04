#!/usr/bin/env bun

import { S3Client } from "bun";
import { basename } from "path";
import { readdir } from "node:fs/promises";
import meow from "meow";

const cli = meow(
  `
	Usage
	    $ s3upload <bucket>

	Options
    --file                 Single file to upload
    --dir                  Directory to upload recursively
    --region               AWS region
    --endpoint             S3 endpoint/url
    --access-key-id        AWS access key ID
    --secret-access-key    AWS secret access key
    -h, --help             Displays this message
    -v, --version          Displays the version number

	Examples
	   $ s3upload my-bucket --file index.html
    $ s3upload react-site --dir build --access-key-id $AWS_ACCESS_KEY_ID --secret-access-key $AWS_SECRET_ACCESS_KEY --endpoint $S3_URL --region $AWS_REGION
`,
  {
    importMeta: import.meta, // This is required
    flags: {
      file: {
        type: "string",
        shortFlag: "f",
      },
      dir: {
        type: "string",
      },
      region: {
        type: "string",
      },
      endpoint: {
        type: "string",
      },
      accessKeyId: {
        type: "string",
      },
      secretAccessKey: {
        type: "string",
      },
    },
  }
);

const bucket = cli.input.at(0);
if (bucket) upload(bucket, cli.flags);
else {
  console.error("Please provide a bucket name as argument");
  cli.showHelp(1);
}

async function upload(bucket: string, flags: typeof cli.flags) {
  if (!flags.file && !flags.dir) {
    console.error("Either --file or --dir must be specified");
    process.exit(1);
  }

  const client = new S3Client({
    bucket: bucket,
    region: flags.region,
    accessKeyId: flags.accessKeyId,
    secretAccessKey: flags.secretAccessKey,
    endpoint: flags.endpoint,
  });

  // File takes precedence
  if (flags.file) {
    const key = basename(flags.file);
    await client.write(key, Bun.file(flags.file));
    console.log(`✓ Uploaded ${key}  to ${bucket}`);
    return;
  }

  if (flags.dir) {
    // Handle recursive directory upload
    const directoryContent = await readdir(flags.dir, {
      recursive: true,
      withFileTypes: true,
    });

    const files = directoryContent.reduce((acc: string[], dirent) => {
      if (dirent.isFile()) {
        acc.push(
          dirent.parentPath
            ? dirent.parentPath + "/" + dirent.name
            : dirent.name
        );
      }
      return acc;
    }, []);

    for (const file of files) {
      await client.write(file, Bun.file(file));
      console.log(`✓ Uploaded ${file} to ${bucket}`);
    }

    console.log(`Uploaded ${files.length} files to ${bucket}`);
  }
}
