package gov.nysenate.openleg.util;

import org.apache.commons.io.filefilter.*;
import org.springframework.core.io.UrlResource;

import java.io.*;
import java.util.*;

public class FileIOUtils
{
    /**
     * Returns a collection of files sorted by file name (not file path!)
     *
     * @param directory - The directory to get files from.
     * @param recursive - true to retrieve files from sub-directories.
     * @return Collection<File>
     * @throws java.io.IOException
     */
    public static Collection<File> getSortedFiles(File directory, boolean recursive, String[] excludeDirs)
            throws IOException {
        Collection<File> files = safeListFiles(directory, recursive, excludeDirs);
        Collections.sort((List<File>) files, new Comparator<File>() {
            public int compare(File a, File b) {
                return a.getName().compareTo(b.getName());
            }
        });
        return files;
    }

    /**
     * Any directory that we attempt to list files from should exist. If it doesn't then
     * create them. This makes the processes robust against incomplete environment setups.
     *
     * @param directory - The directory to list files from (and create if necessary)
     * @param extensions - A list of extensions to grab. null for all extensions.
     * @param recursive - true when you want to list files recursively.
     * @return A collection of matching filenames
     * @throws IOException
     */
    public static Collection<File> safeListFiles(File directory, String[] extensions, boolean recursive) throws IOException {
        org.apache.commons.io.FileUtils.forceMkdir(directory);
        return org.apache.commons.io.FileUtils.listFiles(directory, extensions, recursive);
    }

    /**
     * Any directory that we attempt to list files from should exist. If it doesn't then
     * create them. This overload can be used to exclude certain directories if recursive is true.
     *
     * @param directory - The directory to list files from (and create if necessary)
     * @param recursive - true when you want to list files recursively.
     * @param excludeDirs - Array of directory names that should be excluded from the match.
     *                      Set to null if all directories should be matched.
     * @return A collection of matching filenames
     * @throws IOException
     */
    public static Collection<File> safeListFiles(File directory, boolean recursive, String[] excludeDirs) throws IOException {
        org.apache.commons.io.FileUtils.forceMkdir(directory);
        IOFileFilter dirFileFilter;
        if (excludeDirs != null && excludeDirs.length > 0) {
            List<IOFileFilter> excludeDirFilters = new ArrayList<>();
            for (String excludeDir : excludeDirs) {
                excludeDirFilters.add(FileFilterUtils.nameFileFilter(excludeDir));
            }
            dirFileFilter = FileFilterUtils.notFileFilter(new OrFileFilter(excludeDirFilters));
        }
        else {
            dirFileFilter = (recursive) ? TrueFileFilter.TRUE : FalseFileFilter.FALSE;
        }
        return org.apache.commons.io.FileUtils.listFiles(directory, TrueFileFilter.TRUE, dirFileFilter);
    }

    /**
     * Create the specified folder if necessary and return a File handle to it.
     *
     * @param parent - The parent directory for this folder
     * @param folderName - The name of the directory to retrieve
     * @return a File handle to the requested folder.
     * @throws IOException
     */
    public static File safeGetFolder(File parent, String folderName) throws IOException {
        File directory = new File(parent, folderName);
        org.apache.commons.io.FileUtils.forceMkdir(directory);
        return directory;
    }

    /**
     * Moves a file, deleting the destination file if it already exists.
     *
     * @param file File
     * @param directory File
     * @param createDirectory ?
     * @throws IOException
     */
    public static void moveFileToDirectory(File file, File directory, boolean createDirectory) throws IOException {
        File newFile = new File(directory, file.getName());
        if (newFile.exists()) {
            newFile.delete();
        }
        org.apache.commons.io.FileUtils.moveFileToDirectory(file, directory, true);
    }

    /**
     * Writes out an InputStream to the destination file path specified.
     *
     * @param stuffToWrite InputStream
     * @param destinationPath String
     * @throws IOException
     */
    public static void writeToFile(InputStream stuffToWrite, String destinationPath) throws IOException {
        OutputStream os = new FileOutputStream(destinationPath);
        byte[] b = new byte[2048];
        int length;
        while ((length = stuffToWrite.read(b)) != -1) {
            os.write(b, 0, length);
        }
        stuffToWrite.close();
        os.close();
    }
}
